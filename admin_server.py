"""
admin_server.py — Admin Panel + SePay Webhook
Local:      python3 admin_server.py  →  http://localhost:5001/admin
Production: set DATABASE_URL env var  →  dùng PostgreSQL tự động
"""
import os, re, json, sqlite3, hmac, hashlib
from datetime import datetime
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

# ─── PostgreSQL support (tự động bật khi có DATABASE_URL) ─────
DATABASE_URL = os.environ.get('DATABASE_URL', '')
IS_PG = bool(DATABASE_URL)

if IS_PG:
    import psycopg2
    import psycopg2.extras
    # Railway dùng postgres:// nhưng psycopg2 cần postgresql://
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    print(f"🐘 PostgreSQL mode: {DATABASE_URL[:40]}...")
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brain.db")
    print(f"🗄️  SQLite mode: {DB_PATH}")

app = Flask(__name__)
CORS(app, origins="*")

# ─── DB Adapter: hoạt động với cả SQLite và PostgreSQL ────────
class DB:
    """Thin adapter — dùng ? cho SQLite, %s cho PostgreSQL."""

    @staticmethod
    def _conn():
        if IS_PG:
            return psycopg2.connect(DATABASE_URL)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @staticmethod
    def _adapt(sql):
        """Chuyển SQL từ SQLite → PostgreSQL nếu cần."""
        if not IS_PG:
            return sql
        sql = sql.replace('?', '%s')
        sql = re.sub(r'INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY', sql, flags=re.IGNORECASE)
        sql = sql.replace('INSERT OR IGNORE', 'INSERT')
        return sql

    @classmethod
    def _rows(cls, cur):
        if IS_PG:
            return [dict(r) for r in cur.fetchall()]
        return [dict(r) for r in cur.fetchall()]

    @classmethod
    def _row(cls, cur):
        r = cur.fetchone()
        return dict(r) if r else None

    @classmethod
    def fetchall(cls, sql, params=()):
        sql = cls._adapt(sql)
        conn = cls._conn()
        try:
            if IS_PG:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            else:
                cur = conn.cursor()
            cur.execute(sql, params)
            if IS_PG:
                return [dict(r) for r in cur.fetchall()]
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @classmethod
    def fetchone(cls, sql, params=()):
        sql = cls._adapt(sql)
        conn = cls._conn()
        try:
            if IS_PG:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            else:
                cur = conn.cursor()
            cur.execute(sql, params)
            r = cur.fetchone()
            return dict(r) if r else None
        finally:
            conn.close()

    @classmethod
    def execute(cls, sql, params=()):
        """Chạy INSERT/UPDATE/DELETE, trả về lastrowid."""
        sql = cls._adapt(sql)
        conn = cls._conn()
        try:
            if IS_PG:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                # Thêm RETURNING id cho INSERT để lấy ID mới
                if sql.strip().upper().startswith('INSERT') and 'RETURNING' not in sql.upper():
                    sql += ' RETURNING id'
                cur.execute(sql, params)
                conn.commit()
                try:
                    row = cur.fetchone()
                    return dict(row)['id'] if row and 'id' in dict(row) else None
                except Exception:
                    return None
            else:
                cur = conn.execute(sql, params)
                conn.commit()
                return cur.lastrowid
        finally:
            conn.close()

    @classmethod
    def run(cls, sql, params=()):
        """Chạy UPDATE/DELETE không cần return ID."""
        sql = cls._adapt(sql)
        conn = cls._conn()
        try:
            if IS_PG:
                cur = conn.cursor()
                cur.execute(sql, params)
                conn.commit()
            else:
                conn.execute(sql, params)
                conn.commit()
        finally:
            conn.close()

# ─── Schema init (tự động tạo bảng nếu chưa có) ─────────────
def init_schema():
    pk = "SERIAL PRIMARY KEY" if IS_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"
    ts = "TIMESTAMPTZ DEFAULT NOW()" if IS_PG else "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"

    tables = [
        f"""CREATE TABLE IF NOT EXISTS products (
            id          {pk},
            name        TEXT    NOT NULL,
            type        TEXT    NOT NULL CHECK(type IN ('physical','digital','service')),
            price       INTEGER NOT NULL,
            description TEXT,
            stock       INTEGER DEFAULT NULL,
            is_active   INTEGER DEFAULT 1,
            created_at  {ts}
        )""",
        f"""CREATE TABLE IF NOT EXISTS customers (
            id            {pk},
            name          TEXT NOT NULL,
            phone         TEXT UNIQUE NOT NULL,
            zalo          TEXT,
            email         TEXT,
            source        TEXT DEFAULT 'waitlist',
            notes         TEXT,
            registered_at {ts}
        )""",
        f"""CREATE TABLE IF NOT EXISTS orders (
            id             {pk},
            customer_id    INTEGER,
            customer_name  TEXT,
            customer_phone TEXT,
            product_id     INTEGER,
            product_name   TEXT,
            amount         INTEGER NOT NULL,
            status         TEXT NOT NULL DEFAULT 'pending'
                           CHECK(status IN ('pending','confirmed','success','shipping','delivered','cancelled','refunded')),
            payment_method TEXT DEFAULT 'cod'
                           CHECK(payment_method IN ('cod','bank_transfer','other')),
            payment_ref    TEXT,
            address        TEXT,
            notes          TEXT,
            ordered_at     {ts},
            updated_at     {ts}
        )""",
    ]

    conn = DB._conn()
    try:
        for sql in tables:
            if IS_PG:
                cur = conn.cursor()
            else:
                cur = conn.cursor()
            cur.execute(sql)
        conn.commit()
        print("✅ Schema ready")
    finally:
        conn.close()

    # Seed sản phẩm mặc định nếu chưa có
    if not DB.fetchall("SELECT id FROM products"):
        conflict = "ON CONFLICT DO NOTHING" if IS_PG else ""
        DB.execute(
            f"INSERT INTO products(name,type,price,description) VALUES(?,?,?,?) {conflict}",
            ("Shiseido Ultimune Serum 30ml","physical",2480000,"Serum chống lão hóa tích hợp SPF — 1 bước thay 5 bước.")
        )
        DB.execute(
            f"INSERT INTO products(name,type,price,description) VALUES(?,?,?,?) {conflict}",
            ("Combo 3 Phút Buổi Sáng (Serum 50ml + Kem dưỡng)","physical",2780000,"Bộ đôi tối giản phụ nữ 30-45 tuổi. Freeship + quà VIP 450k.")
        )
        DB.execute(
            f"INSERT INTO products(name,type,price,description) VALUES(?,?,?,?) {conflict}",
            ("Checklist Da Đẹp 3 Phút (PDF)","digital",2000,"File PDF checklist buổi sáng/tối. Nhận qua Zalo trong 5 phút.")
        )
        print("✅ Default products seeded")

# ─── PRODUCTS ─────────────────────────────────────────────────
@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify(DB.fetchall("SELECT * FROM products ORDER BY id"))

@app.route("/api/products", methods=["POST"])
def create_product():
    d = request.json
    ptype = d.get("type","physical")
    stock = d.get("stock") if ptype == "physical" else None
    lid = DB.execute(
        "INSERT INTO products(name,type,price,description,stock,is_active) VALUES(?,?,?,?,?,1)",
        (d["name"], ptype, int(d["price"]), d.get("description",""), stock)
    )
    return jsonify(DB.fetchone("SELECT * FROM products WHERE id=?", (lid,))), 201

@app.route("/api/products/<int:pid>", methods=["PUT"])
def update_product(pid):
    d = request.json
    ptype = d.get("type","physical")
    stock = d.get("stock") if ptype == "physical" else None
    DB.run("UPDATE products SET name=?,type=?,price=?,description=?,stock=?,is_active=? WHERE id=?",
           (d["name"],ptype,int(d["price"]),d.get("description",""),stock,d.get("is_active",1),pid))
    row = DB.fetchone("SELECT * FROM products WHERE id=?", (pid,))
    if not row: abort(404)
    return jsonify(row)

@app.route("/api/products/<int:pid>", methods=["DELETE"])
def delete_product(pid):
    DB.run("DELETE FROM products WHERE id=?", (pid,))
    return jsonify({"ok": True})

# ─── CUSTOMERS ────────────────────────────────────────────────
@app.route("/api/customers", methods=["GET"])
def get_customers():
    return jsonify(DB.fetchall("SELECT * FROM customers ORDER BY id DESC"))

@app.route("/api/customers", methods=["POST"])
def create_customer():
    d = request.json
    try:
        lid = DB.execute(
            "INSERT INTO customers(name,phone,zalo,email,source,notes) VALUES(?,?,?,?,?,?)",
            (d["name"],d["phone"],d.get("zalo",d["phone"]),d.get("email"),d.get("source","manual"),d.get("notes"))
        )
        return jsonify(DB.fetchone("SELECT * FROM customers WHERE id=?", (lid,))), 201
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            return jsonify({"error": "Số điện thoại đã tồn tại"}), 400
        raise

@app.route("/api/customers/<int:cid>", methods=["PUT"])
def update_customer(cid):
    d = request.json
    DB.run("UPDATE customers SET name=?,phone=?,zalo=?,email=?,source=?,notes=? WHERE id=?",
           (d["name"],d["phone"],d.get("zalo",d["phone"]),d.get("email"),d.get("source","manual"),d.get("notes"),cid))
    row = DB.fetchone("SELECT * FROM customers WHERE id=?", (cid,))
    if not row: abort(404)
    return jsonify(row)

@app.route("/api/customers/<int:cid>", methods=["DELETE"])
def delete_customer(cid):
    DB.run("DELETE FROM customers WHERE id=?", (cid,))
    return jsonify({"ok": True})

# ─── ORDERS ───────────────────────────────────────────────────
@app.route("/api/orders", methods=["GET"])
def get_orders():
    return jsonify(DB.fetchall("""
        SELECT o.*, c.name AS cname, c.phone AS cphone, p.name AS pname, p.type AS ptype
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN products  p ON o.product_id  = p.id
        ORDER BY o.id DESC
    """))

@app.route("/api/orders", methods=["POST"])
def create_order():
    d = request.json
    product_id = d.get("product_id")
    product = DB.fetchone("SELECT * FROM products WHERE id=?", (product_id,)) if product_id else None
    # Trừ kho: chỉ với physical + stock không NULL
    if product and product["type"] == "physical" and product.get("stock") is not None:
        ns = product["stock"] - 1
        if ns < 0: return jsonify({"error": "Hết hàng!"}), 400
        DB.run("UPDATE products SET stock=? WHERE id=?", (ns, product_id))
    product_name = product["name"] if product else d.get("product_name","")
    customer = DB.fetchone("SELECT * FROM customers WHERE id=?", (d["customer_id"],)) if d.get("customer_id") else None
    cname  = customer["name"]  if customer else d.get("customer_name","")
    cphone = customer["phone"] if customer else d.get("customer_phone","")
    lid = DB.execute("""
        INSERT INTO orders(customer_id,customer_name,customer_phone,
                           product_id,product_name,amount,status,
                           payment_method,payment_ref,address,notes)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (d.get("customer_id"),cname,cphone,product_id,product_name,
         int(d["amount"]),d.get("status","pending"),
         d.get("payment_method","cod"),d.get("payment_ref",""),
         d.get("address",""),d.get("notes","")))
    # Gửi email tự động qua Resend
    try:
        notify_order_emails(name, phone, pnm, amount, ref, address, status, email)
    except Exception as em_err:
        print("[Resend] Error:", em_err)

    return jsonify(DB.fetchone("SELECT * FROM orders WHERE id=?", (lid,))), 201

@app.route("/api/orders/<int:oid>", methods=["PUT"])
def update_order(oid):
    d = request.json
    DB.run("""UPDATE orders SET customer_id=?,customer_name=?,customer_phone=?,
                                product_id=?,product_name=?,amount=?,status=?,
                                payment_method=?,payment_ref=?,address=?,notes=?,
                                updated_at=CURRENT_TIMESTAMP WHERE id=?""",
           (d.get("customer_id"),d.get("customer_name",""),d.get("customer_phone",""),
            d.get("product_id"),d.get("product_name",""),int(d["amount"]),
            d.get("status","pending"),d.get("payment_method","cod"),
            d.get("payment_ref",""),d.get("address",""),d.get("notes",""),oid))
    row = DB.fetchone("SELECT * FROM orders WHERE id=?", (oid,))
    if not row: abort(404)
    return jsonify(row)

@app.route("/api/orders/<int:oid>", methods=["DELETE"])
def delete_order(oid):
    DB.run("DELETE FROM orders WHERE id=?", (oid,))
    return jsonify({"ok": True})

# ─── CHECK PAYMENT (landing page polling) ─────────────────────
@app.route("/api/check-payment/<ref>", methods=["GET"])
def check_payment(ref):
    row = DB.fetchone(
        "SELECT id,status,payment_ref,amount,customer_name FROM orders WHERE payment_ref=? ORDER BY id DESC LIMIT 1",
        (ref,))
    if not row:
        return jsonify({"found": False, "status": None})
    return jsonify({"found": True, "status": row["status"], "order": row})

# ─── CREATE ORDER FROM CHECKOUT ───────────────────────────────

# ─── RESEND EMAIL INTEGRATION ─────────────────────────────────
def get_resend_api_key():
    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key:
        cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resend_config.txt")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("RESEND_API_KEY="):
                            key = line.strip().split("=", 1)[1]
            except Exception:
                pass
    if not key:
        import base64
        key = base64.b64decode("cmVfY2ZhOFBhZjVfS1N6OWFVZkdHR29kRUR0WmFUWUVhUHlR").decode("utf-8")
    return key

def send_resend_email(to_email, subject, html_content, attachments=None):
    api_key = get_resend_api_key()
    if not api_key:
        print("[Resend] ⚠️ Chưa có RESEND_API_KEY, bỏ qua gửi email.")
        return None
    try:
        import resend
        resend.api_key = api_key
        payload = {
            "from": "DealNgon <orders@dealngon.online>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        }
        if attachments:
            payload["attachments"] = attachments
        res = resend.Emails.send(payload)
        print(f"[Resend] ✅ Gửi email thành công tới {to_email}: {res}")
        return res
    except Exception as e:
        print(f"[Resend] ❌ Lỗi gửi email tới {to_email}: {e}")
        return None

def notify_order_emails(name, phone, product_name, amount, ref, address, status, customer_email=None):
    fmt_amount = f"{amount:,}đ"
    status_text = "ĐÃ THANH TOÁN (SUCCESS)" if status == "success" else "CHỜ THANH TOÁN (PENDING)"
    status_color = "#10B981" if status == "success" else "#D97706"

    # 1. Gửi email thông báo đơn mới tới DealNgon (Admin)
    admin_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #EBDCD0; border-radius: 12px; padding: 22px; color: #2C1810; background: #FFF;">
      <h2 style="color: #9E5C3A; margin-top: 0; font-size: 20px;">🌸 Có đơn hàng mới trên dealngon.online!</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Mã đơn hàng:</td><td style="font-weight: bold; color: #D32F2F;">{ref}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Khách hàng:</td><td style="font-weight: bold;">{name}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Số điện thoại:</td><td>{phone}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Email khách:</td><td>{customer_email or '—'}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Sản phẩm:</td><td style="font-weight: bold;">{product_name}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Số tiền:</td><td style="font-weight: bold; color: #9E5C3A;">{fmt_amount}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Địa chỉ nhận:</td><td>{address or 'Không có (Sản phẩm số)'}</td></tr>
        <tr><td style="padding: 7px 0; color: #7A6559;">Trạng thái:</td><td><strong style="color: {status_color};">{status_text}</strong></td></tr>
      </table>
      <div style="text-align: center; margin-top: 18px;">
        <a href="https://dealngon.online/admin" style="display: inline-block; background: #9E5C3A; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px;">Xem trong trang Admin →</a>
      </div>
    </div>
    """
    send_resend_email("toquynhanh@gmail.com", f"🌸 [ĐƠN HÀNG MỚI] {name} - {phone} ({ref})", admin_html)

    # 2. Nếu khách có nhập Email -> Gửi email xác nhận kèm quà tặng / tài liệu
    if customer_email and "@" in customer_email:
        attachments = []
        is_pdf = "PDF" in product_name or "Checklist" in product_name
        
        # Nếu mua PDF, đính kèm file Checklist
        pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Checklist-Da-Dep-3-Phut-QuynhAnh.pdf")
        if is_pdf and os.path.exists(pdf_path):
            try:
                with open(pdf_path, "rb") as f:
                    attachments.append({
                        "filename": "Checklist-Da-Dep-3-Phut-QuynhAnh.pdf",
                        "content": list(f.read())
                    })
            except Exception as e:
                print(f"[Resend] Không đính kèm được PDF: {e}")

        cust_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #EBDCD0; border-radius: 12px; padding: 24px; color: #2C1810; background: #FFF;">
          <h2 style="color: #9E5C3A; margin-top: 0;">🌸 DealNgon</h2>
          <p>Chào <strong>{name}</strong>,</p>
          <p>Cảm ơn bạn đã tin tưởng lựa chọn giải pháp làm đẹp của DealNgon! Đơn hàng của bạn đã được ghi nhận trên hệ thống:</p>
          <div style="background: #FAF6F2; border-radius: 10px; padding: 14px; margin: 16px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>Mã đơn hàng:</strong> <span style="color:#D32F2F;">{ref}</span></p>
            <p style="margin: 4px 0;"><strong>Sản phẩm:</strong> {product_name}</p>
            <p style="margin: 4px 0;"><strong>Tổng thanh toán:</strong> <strong style="color:#9E5C3A;">{fmt_amount}</strong></p>
            <p style="margin: 4px 0;"><strong>Trạng thái:</strong> <span style="color:{status_color}; font-weight:bold;">{status_text}</span></p>
          </div>
          {'<p style="color:#10B981; font-weight:bold;">🎁 File PDF Checklist đã được đính kèm ngay bên dưới email này để bạn tải về máy dán gương nhé!</p><div style="text-align:center;margin:16px 0;"><a href="https://dealngon.online/Checklist-Da-Dep-3-Phut-QuynhAnh.pdf" style="display:inline-block;background:#9E5C3A;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;font-size:14px;">📥 Bấm vào đây để tải trực tiếp file PDF</a></div>' if is_pdf else '<p>DealNgon sẽ liên hệ qua Zalo / Số điện thoại để xác nhận và đóng gói gửi hàng sớm nhất cho bạn nhé.</p>'}
          <hr style="border:none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">Mọi thắc mắc vui lòng liên hệ Zalo: <strong>0977 338 876 (DealNgon)</strong> · Website: dealngon.online</p>
        </div>
        """
        send_resend_email(customer_email, f"🌸 [Xác nhận đơn hàng] {product_name} - Mã #{ref}", cust_html, attachments)

@app.route("/api/orders/from-checkout", methods=["POST"])
def create_order_from_checkout():
    d = request.json
    phone = (d.get("phone") or "").strip()
    name = (d.get("name") or "Khách hàng").strip()
    email = (d.get("email") or "").strip()
    address = (d.get("address") or "").strip()
    notes = (d.get("notes") or "").strip()

    # 1. Thêm hoặc cập nhật Khách hàng vào bảng customers
    cid = None
    if phone:
        customer = DB.fetchone("SELECT id FROM customers WHERE phone=?", (phone,))
        if not customer:
            try:
                cid = DB.execute(
                    "INSERT INTO customers(name,phone,zalo,email,source,notes) VALUES(?,?,?,?,'order',?)",
                    (name, phone, phone, email or None, address or notes))
            except Exception:
                c2 = DB.fetchone("SELECT id FROM customers WHERE phone=?", (phone,))
                cid = c2["id"] if c2 else None
        else:
            cid = customer["id"]
            DB.run("UPDATE customers SET name=?, email=COALESCE(NULLIF(?,''), email), notes=? WHERE id=?",
                   (name, email, address or notes, cid))

    pkg = d.get("package","")
    is_combo2 = "Combo 2" in pkg or "2.780" in pkg
    is_digital = "PDF" in pkg or "49.000" in pkg
    amount = 2000 if is_digital else (2780000 if is_combo2 else 2480000)
    keyword = "PDF" if is_digital else ("50ml" if is_combo2 else "30ml")
    product = DB.fetchone("SELECT id,name FROM products WHERE name LIKE ?", (f"%{keyword}%",))
    pid  = product["id"]   if product else None
    pnm  = product["name"] if product else pkg

    status = d.get("status", "pending")
    ref = d.get("payment_ref", "").strip()

    existing = DB.fetchone("SELECT id FROM orders WHERE payment_ref=?", (ref,)) if ref else None
    if existing:
        DB.run("""
            UPDATE orders SET customer_id=?, customer_name=?, customer_phone=?,
                              product_id=?, product_name=?, amount=?, status=?,
                              address=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        """, (cid, name, phone, pid, pnm, amount, status, address, notes, existing["id"]))
        lid = existing["id"]
    else:
        lid = DB.execute("""
            INSERT INTO orders(customer_id,customer_name,customer_phone,
                               product_id,product_name,amount,status,
                               payment_method,payment_ref,address,notes)
            VALUES(?,?,?,?,?,?,?,'bank_transfer',?,?,?)""",
            (cid, name, phone, pid, pnm, amount, status, ref, address, notes))

    # Gửi email tự động qua Resend
    try:
        notify_order_emails(name, phone, pnm, amount, ref, address, status, email)
    except Exception as em_err:
        print("[Resend] Error:", em_err)

    return jsonify(DB.fetchone("SELECT * FROM orders WHERE id=?", (lid,))), 201

# ─── SEPAY WEBHOOK ────────────────────────────────────────────
@app.route("/webhook/sepay", methods=["POST"])
def sepay_webhook():
    # Xác thực chữ ký HMAC-SHA256 nếu có cài đặt Secret Key
    secret = os.environ.get("SEPAY_WEBHOOK_SECRET", "").strip()
    if secret:
        signature = request.headers.get("X-SePay-Signature", "")
        expected = hmac.new(secret.encode("utf-8"), request.get_data(), hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            print(f"[SePay] ❌ Chữ ký HMAC không hợp lệ!")
            return jsonify({"error": "Invalid signature"}), 401

    data = request.json or {}
    print(f"[SePay] {json.dumps(data, ensure_ascii=False)}")
    content = str(data.get("content","") or data.get("transferContent","") or "")
    pending = DB.fetchall("SELECT * FROM orders WHERE status='pending' AND payment_ref != ''")
    matched_id = None
    for order in pending:
        ref = order.get("payment_ref","")
        if ref and ref.upper() in content.upper():
            DB.run("UPDATE orders SET status='success', payment_method='bank_transfer', updated_at=CURRENT_TIMESTAMP WHERE id=?",
                   (order["id"],))
            matched_id = order["id"]
            print(f"[SePay] ✅ Order #{matched_id} confirmed")

            # Gửi email thông báo thanh toán thành công
            try:
                # Tìm email khách hàng nếu có
                cust = DB.fetchone("SELECT email FROM customers WHERE id=?", (order.get("customer_id"),)) if order.get("customer_id") else None
                c_email = cust["email"] if cust else None
                notify_order_emails(order.get("customer_name",""), order.get("customer_phone",""),
                                    order.get("product_name",""), order.get("amount",0),
                                    order.get("payment_ref",""), order.get("address",""), "success", c_email)
            except Exception as e_mail:
                print(f"[Resend SePay] Error: {e_mail}")
            break
    return jsonify({"success": True, "matched_order": matched_id}), 200

# ─── ADMIN HTML ───────────────────────────────────────────────
ADMIN_HTML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "admin.html")


# ─── SERVE THANH TOAN HTML ────────────────────────────────────
THANH_TOAN_HTML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thanh-toan.html")

@app.route("/thanh-toan")
@app.route("/thanh-toan/")
def thanh_toan():
    with open(THANH_TOAN_HTML_PATH, encoding="utf-8") as f:
        return f.read()

@app.route("/admin")
@app.route("/admin/")
def admin():
    with open(ADMIN_HTML_PATH, encoding="utf-8") as f:
        return f.read()

@app.route("/")
def root():
    return '<meta http-equiv="refresh" content="0;url=/admin">'

@app.route("/health")
def health():
    db_type = "postgresql" if IS_PG else "sqlite"
    return jsonify({"status": "ok", "db": db_type, "time": datetime.now().isoformat()})

if __name__ == "__main__":
    init_schema()
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 Admin: http://localhost:{port}/admin")
    print(f"🔗 Webhook: https://web-production-42cec4.up.railway.app/webhook/sepay")
    app.run(host="0.0.0.0", port=port, debug=not IS_PG)
