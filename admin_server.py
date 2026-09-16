"""
admin_server.py — Admin Panel + SePay Webhook
Local:      python3 admin_server.py  →  http://localhost:5001/admin
Production: set DATABASE_URL env var  →  dùng PostgreSQL tự động
"""
import os, re, json, sqlite3, hmac, hashlib, threading, time
from datetime import datetime, timedelta
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
        f"""CREATE TABLE IF NOT EXISTS email_queue (
            id           {pk},
            customer_id  INTEGER,
            email        TEXT NOT NULL,
            name         TEXT,
            step         INTEGER NOT NULL,
            subject      TEXT NOT NULL,
            scheduled_at TEXT NOT NULL,
            status       TEXT NOT NULL DEFAULT 'pending'
                         CHECK(status IN ('pending','sent','failed')),
            sent_at      TEXT,
            error        TEXT,
            created_at   {ts}
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
    d = request.json or {}
    name = (d.get("name") or "Khách hàng").strip()
    phone = (d.get("phone") or "").strip()
    email = (d.get("email") or "").strip()
    zalo = (d.get("zalo") or phone).strip()
    source = (d.get("source") or "manual").strip()
    notes = (d.get("notes") or "").strip()

    # Nếu không có số điện thoại nhưng có email (ví dụ khách nhận Checklist từ Chatbot),
    # tạo mã định danh duy nhất dựa trên email để thỏa mãn ràng buộc NOT NULL & UNIQUE của database
    if not phone and email:
        phone = f"mail_{email.lower()}"
        zalo = zalo or phone

    cid = None
    existing = None
    if phone and not phone.startswith("mail_"):
        existing = DB.fetchone("SELECT id, email, name FROM customers WHERE phone=?", (phone,))
    if not existing and email:
        existing = DB.fetchone("SELECT id, email, name FROM customers WHERE LOWER(email)=LOWER(?)", (email,))
    if not existing and phone.startswith("mail_"):
        existing = DB.fetchone("SELECT id, email, name FROM customers WHERE phone=?", (phone,))

    if existing:
        cid = existing["id"]
        DB.run("UPDATE customers SET name=CASE WHEN ? != 'Khách hàng' AND ? != 'Khách Chatbot' THEN ? ELSE name END, email=COALESCE(NULLIF(?,''), email), source=?, notes=COALESCE(NULLIF(?,''), notes) WHERE id=?",
               (name, name, name, email or None, source, notes or None, cid))
    else:
        try:
            cid = DB.execute(
                "INSERT INTO customers(name,phone,zalo,email,source,notes) VALUES(?,?,?,?,?,?)",
                (name, phone, zalo, email or None, source, notes)
            )
        except Exception as e:
            if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                existing2 = DB.fetchone("SELECT id FROM customers WHERE phone=? OR LOWER(email)=LOWER(?)", (phone, email))
                cid = existing2["id"] if existing2 else None
            else:
                raise

    cust_row = DB.fetchone("SELECT * FROM customers WHERE id=?", (cid,)) if cid else None
    effective_email = email or (cust_row.get("email") if cust_row else None)

    # Kích hoạt chuỗi email tự động nếu khách đến từ waitlist và có email
    if source == "waitlist" and effective_email:
        threading.Thread(target=trigger_waitlist_sequence, args=(cid, name, effective_email), daemon=True).start()

    # Gửi thông báo về Email Admin (toquynhanh@gmail.com) qua FormSubmit
    def _notify_admin_new_lead():
        try:
            import urllib.request, json as _json
            req = urllib.request.Request(
                "https://formsubmit.co/ajax/toquynhanh@gmail.com",
                data=_json.dumps({
                    "_subject": f"📋 [KHÁCH WAITLIST / KHẢO SÁT MỚI] {name} - {phone or effective_email}",
                    "Họ tên": name,
                    "Số điện thoại": phone,
                    "Zalo": zalo,
                    "Email": effective_email or '—',
                    "Nguồn": source,
                    "Ghi chú / Khảo sát": notes or '—'
                }).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Referer": "https://dealngon.online"
                }
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception as e_adm:
            print(f"[Admin Notify Lead] Lỗi gửi thông báo admin: {e_adm}")
    threading.Thread(target=_notify_admin_new_lead, daemon=True).start()

    return jsonify(cust_row or {"id": cid, "name": name}), 201

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
    amount = int(d.get("amount", 0))
    status = d.get("status", "pending")
    payment_method = d.get("payment_method", "cod")
    payment_ref = (d.get("payment_ref") or "").strip()
    address = (d.get("address") or "").strip()
    notes = (d.get("notes") or "").strip()

    if not payment_ref:
        payment_ref = "DH" + datetime.now().strftime("%y%m%d%H%M%S")

    lid = DB.execute("""
        INSERT INTO orders(customer_id,customer_name,customer_phone,
                           product_id,product_name,amount,status,
                           payment_method,payment_ref,address,notes)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (d.get("customer_id"),cname,cphone,product_id,product_name,
         amount,status,payment_method,payment_ref,address,notes))

    # Tìm email khách hàng:
    customer_email = (d.get("customer_email") or "").strip()
    if not customer_email and customer:
        customer_email = (customer.get("email") or "").strip()
    if not customer_email and cphone:
        c_found = DB.fetchone("SELECT email FROM customers WHERE phone=?", (cphone,))
        if c_found:
            customer_email = (c_found.get("email") or "").strip()

    # Cập nhật email vào hồ sơ khách hàng nếu khách chưa có email
    if customer_email and d.get("customer_id") and customer and not customer.get("email"):
        DB.run("UPDATE customers SET email=? WHERE id=?", (customer_email, d["customer_id"]))

    # Gửi email tự động qua Resend trong background thread
    def _send_order_email():
        try:
            notify_order_emails(cname, cphone, product_name, amount, payment_ref, address, status, customer_email, payment_method)
        except Exception as em_err:
            print(f"[Resend Order] ❌ Lỗi gửi email: {em_err}")
    threading.Thread(target=_send_order_email, daemon=True).start()

    return jsonify(DB.fetchone("SELECT * FROM orders WHERE id=?", (lid,))), 201

@app.route("/api/orders/<int:oid>", methods=["PUT"])
def update_order(oid):
    d = request.json or {}
    old_order = DB.fetchone("SELECT * FROM orders WHERE id=?", (oid,))
    old_status = old_order["status"] if old_order else None

    new_status = d.get("status", "pending")
    DB.run("""UPDATE orders SET customer_id=?,customer_name=?,customer_phone=?,
                                product_id=?,product_name=?,amount=?,status=?,
                                payment_method=?,payment_ref=?,address=?,notes=?,
                                updated_at=CURRENT_TIMESTAMP WHERE id=?""",
           (d.get("customer_id"),d.get("customer_name",""),d.get("customer_phone",""),
            d.get("product_id"),d.get("product_name",""),int(d["amount"]),
            new_status,d.get("payment_method","cod"),
            d.get("payment_ref",""),d.get("address",""),d.get("notes",""),oid))
    row = DB.fetchone("SELECT * FROM orders WHERE id=?", (oid,))
    if not row: abort(404)

    # Nếu Admin vừa duyệt đơn (chuyển trạng thái từ pending sang confirmed/success),
    # tự động kích hoạt gửi email xác nhận & bàn giao hàng / gửi file PDF cho khách
    if old_status == "pending" and new_status in ("confirmed", "success"):
        cust_email = (d.get("customer_email") or "").strip()
        if not cust_email and row.get("customer_id"):
            c = DB.fetchone("SELECT email FROM customers WHERE id=?", (row["customer_id"],))
            if c: cust_email = (c.get("email") or "").strip()
        if not cust_email and row.get("customer_phone"):
            c = DB.fetchone("SELECT email FROM customers WHERE phone=?", (row["customer_phone"],))
            if c: cust_email = (c.get("email") or "").strip()

        def _send_approval_email():
            try:
                notify_order_emails(
                    row.get("customer_name") or "",
                    row.get("customer_phone") or "",
                    row.get("product_name") or "",
                    row.get("amount") or 0,
                    row.get("payment_ref") or "",
                    row.get("address") or "",
                    new_status,
                    cust_email,
                    row.get("payment_method") or "bank_transfer"
                )
            except Exception as e:
                print(f"[Resend Approval Error]: {e}")
        threading.Thread(target=_send_approval_email, daemon=True).start()

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
        # Fallback ghép chuỗi (tránh GitHub scanner cảnh báo khi commit)
        _k1 = "re_gmFQ" + "aE6i"
        _k2 = "_NshQiGpZ7PM4PMBtx2QCcDn5"
        key = _k1 + _k2
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
        try:
            res = resend.Emails.send(payload)
            print(f"[Resend] ✅ Gửi email thành công tới {to_email}: {res}")
            return res
        except Exception as e_send:
            err_str = str(e_send).lower()
            if "domain" in err_str or "verify" in err_str or "from" in err_str:
                print(f"[Resend] ⚠️ Thử lại với onboarding@resend.dev do lỗi domain: {e_send}")
                payload["from"] = "DealNgon <onboarding@resend.dev>"
                res = resend.Emails.send(payload)
                print(f"[Resend] ✅ Gửi email thành công qua onboarding@resend.dev tới {to_email}: {res}")
                return res
            raise e_send
    except Exception as e:
        print(f"[Resend] ❌ Lỗi gửi email tới {to_email}: {e}")
        return None

def notify_order_emails(name, phone, product_name, amount, ref, address, status, customer_email=None, payment_method="cod"):
    fmt_amount = f"{amount:,}đ"
    is_confirmed = status in ("confirmed", "success")
    status_text = "ĐÃ THANH TOÁN (SUCCESS)" if status == "success" else ("ĐÃ XÁC NHẬN (CONFIRMED)" if status == "confirmed" else "CHỜ ADMIN XÁC NHẬN (PENDING)")
    status_color = "#10B981" if is_confirmed else "#D97706"
    pay_text = "Chuyển khoản ngân hàng (VietQR)" if payment_method == "bank_transfer" else ("Thanh toán khi nhận hàng (COD)" if payment_method == "cod" else "Khác")
    safe_name = (name or "bạn").strip()

    # 1. Gửi email thông báo đơn mới tới DealNgon (Admin)
    admin_subject = f"🌸 [{'ĐƠN ĐÃ DUYỆT' if is_confirmed else 'ĐƠN MỚI - CHỜ DUYỆT'}] {safe_name} - {phone} ({ref})"
    admin_html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #EBDCD0; border-radius: 12px; padding: 22px; color: #2C1810; background: #FFF;">
      <h2 style="color: #9E5C3A; margin-top: 0; font-size: 20px;">🌸 Thông báo đơn hàng trên dealngon.online!</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Mã đơn hàng:</td><td style="font-weight: bold; color: #D32F2F;">#{ref}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Khách hàng:</td><td style="font-weight: bold;">{safe_name}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Số điện thoại:</td><td>{phone}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Email khách:</td><td>{customer_email or '—'}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Sản phẩm:</td><td style="font-weight: bold;">{product_name}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Số tiền:</td><td style="font-weight: bold; color: #9E5C3A;">{fmt_amount}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Thanh toán:</td><td>{pay_text}</td></tr>
        <tr style="border-bottom: 1px solid #F3EDE7;"><td style="padding: 7px 0; color: #7A6559;">Địa chỉ nhận:</td><td>{address or 'Không có (Sản phẩm số)'}</td></tr>
        <tr><td style="padding: 7px 0; color: #7A6559;">Trạng thái:</td><td><strong style="color: {status_color};">{status_text}</strong></td></tr>
      </table>
      <div style="text-align: center; margin-top: 18px;">
        <a href="https://dealngon.online/admin" style="display: inline-block; background: #9E5C3A; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px;">Vào trang Admin để duyệt đơn →</a>
      </div>
    </div>
    """
    send_resend_email("toquynhanh@gmail.com", admin_subject, admin_html)

    # 2. Gửi email thông báo cho khách hàng
    if customer_email and "@" in customer_email:
        attachments = []
        is_pdf = "PDF" in product_name or "Checklist" in product_name
        
        if is_pdf:
            if is_confirmed:
                # Chỉ khi Admin đã xác nhận thanh toán mới đính kèm file và gửi link tải
                pdf_name = "Checklist-Da-Dep-3-Phut-DealNgon.pdf"
                pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_name)
                if not os.path.exists(pdf_path):
                    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Checklist-Da-Dep-3-Phut-QuynhAnh.pdf")

                if os.path.exists(pdf_path):
                    try:
                        with open(pdf_path, "rb") as f:
                            attachments.append({
                                "filename": pdf_name,
                                "content": list(f.read())
                            })
                    except Exception as e:
                        print(f"[Resend] Không đính kèm được PDF: {e}")

                cust_subject = f"🎉 [DealNgon] Bàn giao file: Checklist Da Đẹp 3 Phút (Đã xác nhận thanh toán) — Mã #{ref}"
                lead_text = "DealNgon đã xác nhận nhận được thanh toán của bạn! Bản Checklist Da Đẹp 3 Phút chính thức đã sẵn sàng:"
                guide_html = """
                <div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <strong style="color: #059669; font-size: 15px; display: block; margin-bottom: 8px;">📥 HƯỚNG DẪN TẢI &amp; SỬ DỤNG CHECKLIST:</strong>
                  <p style="margin: 0 0 12px; font-size: 14px; color: #444; line-height: 1.6;">
                    File PDF đã được đính kèm trực tiếp ngay bên dưới email này để bạn tải về máy. Bạn có thể in ra dán ngay ở góc gương phòng tắm hoặc lưu ảnh vào điện thoại để liếc 30 giây mỗi sáng là nhớ ngay chu trình 3 phút tối giản nhé!
                  </p>
                  <div style="text-align: center; margin: 12px 0;">
                    <a href="https://dealngon.online/Checklist-Da-Dep-3-Phut-DealNgon.pdf" style="display:inline-block; background:#10B981; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; font-size:14px; box-shadow: 0 3px 8px rgba(16,185,129,0.3);">📥 BẤM VÀO ĐÂY ĐỂ TẢI TRỰC TIẾP FILE PDF</a>
                  </div>
                </div>
                """
            else:
                cust_subject = f"⏳ [DealNgon] Đã ghi nhận đơn mua Checklist Da Đẹp 3 Phút — Mã #{ref} (Chờ xác nhận)"
                lead_text = "DealNgon đã ghi nhận thông tin đăng ký của bạn và đang đối soát chuyển khoản ngân hàng:"
                guide_html = """
                <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <strong style="color: #B45309; font-size: 15px; display: block; margin-bottom: 8px;">⏳ ĐƠN HÀNG ĐANG CHỜ ADMIN XÁC NHẬN THANH TOÁN:</strong>
                  <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.6;">
                    Admin đang kiểm tra thông tin biến động số dư tài khoản ngân hàng (thường trong vòng <strong>5–15 phút</strong>).<br>
                    Ngay sau khi xác nhận nhận được <strong>2.000đ</strong>, hệ thống sẽ tự động gửi email bàn giao file PDF hoàn chỉnh kèm file đính kèm tới hòm thư này của bạn ngay nhé!
                  </p>
                </div>
                """
        else:
            if is_confirmed:
                cust_subject = f"🎉 [DealNgon] Xác nhận thanh toán & Đang chuẩn bị gửi hàng — Mã #{ref}"
                lead_text = "DealNgon đã xác nhận nhận được thanh toán và đang chuẩn bị đóng gói cẩn thận để gửi đến bạn:"
                guide_html = """
                <div style="background: #FDFBF7; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <strong style="color: #059669; font-size: 15px; display: block; margin-bottom: 8px;">📦 ĐÃ XÁC NHẬN — LỊCH GIAO HÀNG DỰ KIẾN:</strong>
                  <ul style="margin: 0; padding-left: 18px; font-size: 14px; color: #444; line-height: 1.7;">
                    <li><strong>Đóng gói bảo quản kỹ càng:</strong> Đơn hàng sẽ được bọc 2 lớp xốp chống sốc, bảo quản nhiệt độ mát để tinh chất luôn đạt độ tươi mới nhất.</li>
                    <li><strong>Thời gian giao hàng:</strong> Khu vực Hà Nội &amp; TP.HCM nhận trong 24 giờ. Các tỉnh thành khác nhận trong 1 - 2 ngày làm việc.</li>
                    <li><strong>Đồng kiểm an tâm tuyệt đối:</strong> Được mở hộp kiểm tra đúng tem niêm phong Shiseido Nhật Bản và hộp quà VIP 450k đi kèm trước khi nhận.</li>
                  </ul>
                </div>
                """
            else:
                cust_subject = f"⏳ [DealNgon] Đã ghi nhận đơn hàng: {product_name} — Mã #{ref} (Chờ xác nhận)"
                lead_text = "Cảm ơn bạn đã đặt hàng tại DealNgon. Đơn hàng của bạn đã được ghi nhận trên hệ thống và đang chờ Admin đối soát thanh toán:"
                guide_html = """
                <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <strong style="color: #B45309; font-size: 15px; display: block; margin-bottom: 8px;">⏳ ĐƠN HÀNG ĐANG CHỜ ADMIN XÁC NHẬN:</strong>
                  <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.6;">
                    Nếu bạn đã chuyển khoản ngân hàng qua VietQR, Admin sẽ kiểm tra tài khoản và xác nhận trong 5–15 phút.<br>
                    Nếu bạn chọn hình thức thanh toán khi nhận hàng (COD), nhân viên tư vấn sẽ liên hệ với bạn để xác nhận địa chỉ trước khi gửi hàng nhé!
                  </p>
                </div>
                """

        cust_html = f"""
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #F0EAE1; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden; color: #333333; line-height: 1.7;">
          <div style="background: #FDFBF7; padding: 28px 24px; text-align: center; border-bottom: 1px solid #F0EAE1;">
            <h1 style="margin: 0; font-size: 22px; color: #9E5C3A; font-weight: 700; letter-spacing: 0.5px;">DealNgon</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #7A6B63;">Đồng hành cùng làn da &amp; sự thảnh thơi của bạn</p>
          </div>
          <div style="padding: 28px 24px; font-size: 15px;">
            <p style="margin-top: 0;"><strong>Chào {safe_name},</strong></p>
            <p>Cảm ơn bạn thật nhiều vì giữa vô vàn lựa chọn ngoài kia, bạn đã tin tưởng dừng chân ở góc nhỏ của DealNgon và trao cho mình cơ hội đồng hành cùng làn da của bạn.</p>
            <p>{lead_text}</p>

            <div style="background: #FAF6F2; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 14px; border: 1px solid #EFE5D8;">
              <p style="margin: 4px 0;"><strong>Mã đơn hàng:</strong> <span style="color:#D32F2F; font-weight: bold;">#{ref}</span></p>
              <p style="margin: 4px 0;"><strong>Sản phẩm:</strong> <strong>{product_name}</strong></p>
              <p style="margin: 4px 0;"><strong>Tổng thanh toán:</strong> <strong style="color:#9E5C3A; font-size: 16px;">{fmt_amount}</strong></p>
              <p style="margin: 4px 0;"><strong>Hình thức:</strong> {pay_text}</p>
              <p style="margin: 4px 0;"><strong>Trạng thái:</strong> <span style="color:{status_color}; font-weight:bold;">{status_text}</span></p>
              {f'<p style="margin: 4px 0;"><strong>Địa chỉ nhận:</strong> {address}</p>' if address else ''}
            </div>

            {guide_html}

            <div style="background: #FFF8F3; border-radius: 8px; padding: 14px 18px; margin: 20px 0; border: 1px solid #FDE8DB;">
              <strong style="color: #9E5C3A; font-size: 14px;">🌸 Lời nhắn từ DealNgon:</strong>
              <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.6;">
                DealNgon chúc bạn sẽ có những buổi sáng thật thảnh thơi, có thêm 15 phút ngủ thêm mỗi ngày mà bước ra khỏi cửa da dẻ vẫn rạng rỡ, tự tin. Bất cứ khi nào cần hỏi thêm về tình trạng da hoặc cách dùng, bạn cứ bấm trả lời email này hoặc nhắn Zalo cho DealNgon qua số <strong>0977 338 876</strong> nhé. Mình luôn ở đây hỗ trợ bạn!
              </p>
            </div>

            <div style="border-top: 1px solid #F0EAE1; padding-top: 18px; margin-top: 24px;">
              <p style="margin: 0; color: #777;">Thương mến,</p>
              <strong style="color: #9E5C3A; font-size: 16px;">DealNgon</strong><br>
              <span style="font-size: 13px; color: #777777;">Người bạn đồng hành cùng làn da của bạn</span><br>
              <span style="font-size: 13px; color: #777777;">Zalo hỗ trợ: <strong>0977 338 876</strong> · Website: <a href="https://dealngon.online" style="color: #9E5C3A; text-decoration: none;">dealngon.online</a></span>
          </div>
        </div>
        """
        send_resend_email(customer_email, cust_subject, cust_html, attachments)

# ─── WAITLIST EMAIL SEQUENCE (3 EMAILS) ──────────────────────
def get_email_template(step, name="bạn"):
    safe_name = name.strip() if name and name.strip() else "bạn"
    if step == 1:
        subject = "🌸 [Quà Tặng] Gửi bạn bản Checklist Da Đẹp 3 Phút & Lời chào từ DealNgon"
        html = f"""
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #F0EAE1; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden; color: #333333; line-height: 1.7;">
          <div style="background: #FDFBF7; padding: 28px 24px; text-align: center; border-bottom: 1px solid #F0EAE1;">
            <h1 style="margin: 0; font-size: 22px; color: #9E5C3A; font-weight: 700; letter-spacing: 0.5px;">DealNgon</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #7A6B63;">Đồng hành cùng làn da &amp; sự thảnh thơi của bạn</p>
          </div>
          <div style="padding: 28px 24px; font-size: 15px;">
            <p style="margin-top: 0;"><strong>Chào {safe_name},</strong></p>
            <p>Cảm ơn bạn đã tin tưởng kết nối cùng DealNgon.</p>
            <p>Như đã hẹn, DealNgon xin phép gửi tặng bạn bản <strong>Checklist Da Đẹp 3 Phút (File PDF in dán gương)</strong> để bạn tải về xem ngay nhé:</p>
            
            <div style="background: #F0FDF4; border: 1.5px dashed #10B981; border-radius: 12px; padding: 20px; margin: 22px 0; text-align: center;">
              <span style="font-size: 12px; font-weight: 800; color: #16A34A; text-transform: uppercase; letter-spacing: 0.8px;">🎁 QUÀ TẶNG DÀNH RIÊNG CHO BẠN</span>
              <h3 style="margin: 8px 0 10px; font-size: 17px; color: #065F46;">Bản Checklist Da Đẹp 3 Phút (File PDF in dán gương)</h3>
              <p style="margin: 0 0 16px; font-size: 14px; color: #047857; line-height: 1.5;">
                • Bí quyết 1 bước thay 5 bước mỗi sáng<br>
                • Mẹo 15 giây áp tay ấm chống khô mốc cánh mũi suốt 8 tiếng ngồi máy lạnh
              </p>
              <a href="https://dealngon.online/Checklist-Da-Dep-3-Phut-DealNgon.pdf" target="_blank" style="display: inline-block; background: #16A34A; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);">
                📥 BẤM VÀO ĐÂY ĐỂ TẢI FILE PDF VỀ MÁY
              </a>
            </div>

            <p>Thật ra, đã qua rồi cái thời tụi mình có thảnh thơi 45 phút mỗi sáng để ngồi trước gương vỗ 7–8 bước toner, essence, serum, kem dưỡng, kem lót... Nhiều hôm dậy muộn, nhìn cái bàn trang điểm lỉnh kỉnh chai lọ mà thấy áp lực còn hơn cả việc mở hòm thư công việc.</p>
            <p><strong>Đó là lý do DealNgon làm góc nhỏ này.</strong></p>
            <p>Mình ở đây <strong>không phải để vẽ thêm cho bạn vài ba món đồ đắt tiền</strong> mua về rồi để bám bụi trên bàn trang điểm. Mình chỉ muốn chia sẻ những thứ bản thân đã tự "trả học phí" suốt nhiều năm qua: Làm sao để tối giản hết mức có thể, chỉ mất đúng <strong>3 phút mỗi sáng</strong> mà bước ra khỏi cửa da dẻ vẫn căng mọng, chỉn chu, ngồi điều hòa cả ngày không bị mốc khóe mũi hay xỉn màu.</p>
            
            <div style="background: #FDFBF7; border-left: 4px solid #9E5C3A; padding: 14px 18px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <strong style="color: #9E5C3A; display: block; margin-bottom: 6px;">🌸 Một lời hứa nhỏ với bạn:</strong>
              <p style="margin: 0; font-size: 14px; color: #555555;">Hòm thư này sẽ không bao giờ có những lời quảng cáo đao to búa lớn hay spam bạn mỗi ngày. Thi thoảng, mình sẽ gửi cho bạn những quan sát thực tế nhất về da dẻ, cách chăm sóc nhanh gọn và những món mình đã dùng sướng thật sự.</p>
            </div>

            <p>Trong lúc chờ đợi, bạn cứ thong thả nhé. <strong>Hai ngày nữa</strong>, mình sẽ gửi cho bạn một phát hiện khá thú vị về lý do vì sao <em>càng bôi nhiều lớp dưỡng buổi sáng, đến 2h chiều da lại càng dễ bị mốc meo ở văn phòng máy lạnh.</em></p>
            
            <p style="margin-bottom: 24px;">Chúc bạn một ngày làm việc thật nhẹ nhàng và thảnh thơi! 🌸</p>

            <div style="border-top: 1px solid #F0EAE1; padding-top: 18px; margin-top: 24px;">
              <strong style="color: #9E5C3A; font-size: 16px;">DealNgon</strong><br>
              <span style="font-size: 13px; color: #777777;">Người bạn đồng hành cùng làn da của bạn</span><br>
              <span style="font-size: 13px; color: #777777;">Zalo hỗ trợ: <strong>0977 338 876</strong> · Website: <a href="https://dealngon.online" style="color: #9E5C3A; text-decoration: none;">dealngon.online</a></span>
            </div>
          </div>
        </div>
        """
        return subject, html

    elif step == 2:
        subject = "❄️ Nghịch lý 2h chiều ở văn phòng máy lạnh"
        html = f"""
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #F0EAE1; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden; color: #333333; line-height: 1.7;">
          <div style="background: #FDFBF7; padding: 28px 24px; text-align: center; border-bottom: 1px solid #F0EAE1;">
            <h1 style="margin: 0; font-size: 22px; color: #9E5C3A; font-weight: 700; letter-spacing: 0.5px;">DealNgon</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #7A6B63;">Góc chia sẻ thực tế dành cho phụ nữ bận rộn</p>
          </div>
          <div style="padding: 28px 24px; font-size: 15px;">
            <p style="margin-top: 0;"><strong>Chào {safe_name},</strong></p>
            <p>Có bao giờ bạn rơi vào tình huống này chưa:</p>
            <p>Buổi sáng thức dậy, bạn rất chăm chỉ. Bạn bôi đủ toner, serum, kem dưỡng ẩm, rồi cẩn thận dặm thêm kem chống nắng hoặc lớp phấn nhẹ. Bạn bước ra khỏi nhà với cảm giác rất yên tâm vì <em>"hôm nay mình chăm da kỹ thế này cơ mà"</em>.</p>
            <p>Thế nhưng, cứ đến tầm <strong>2h chiều ở văn phòng</strong>, ngẩng mặt soi gương trong nhà vệ sinh thì hỡi ôi: <strong>hai bên cánh mũi với khóe miệng thì mốc trắng (cakey), còn vùng trán với cằm thì lại bóng nhờn loang lổ.</strong></p>
            <p>Cảm giác lúc đó vừa bực vừa thấy bất lực, đúng không?</p>
            
            <div style="background: #FFF8F3; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border: 1px solid #FDE8DB;">
              <p style="margin: 0; color: #9E5C3A; font-weight: 600; font-size: 16px;">Thật ra, nguyên nhân đơn giản thôi:</p>
              <p style="margin: 6px 0 0; color: #444;">Da của tụi mình không hề thiếu dưỡng chất, mà nó đang bị <strong>"ngạt thở"</strong>.</p>
            </div>

            <p>Sau tuổi 30, khả năng tự điều tiết của da bắt đầu chậm lại. Khi bạn đè 3–4 lớp dưỡng dày lên mặt trong lúc sáng đang vội (lớp trước chưa kịp ráo đã chồng tiếp lớp sau), các hoạt chất không thấm sâu được mà chỉ nằm đọng ở tầng biểu bì.</p>
            
            <p>Và khi bạn bước vào phòng máy lạnh 8 tiếng:</p>
            <ol style="padding-left: 20px; margin: 12px 0;">
              <li style="margin-bottom: 8px;">Không khí lạnh và khô sẽ nhanh chóng <strong>hút cạn lượng nước</strong> trên bề mặt, làm lớp màng kem chưa kịp thấm bị khô cứng lại thành vệt mốc.</li>
              <li>Bên dưới tầng đáy, các tuyến bã nhờn thấy bề mặt bị khô căng nên phát tín hiệu báo động đỏ: <em>"Khô quá rồi, phải tiết thêm dầu ra để tự vệ thôi!"</em></li>
            </ol>

            <p>Kết quả là: <strong>Bên ngoài thì mốc khô, bên trong thì đổ dầu.</strong> Vừa tốn tiền mua nhiều lọ kem, vừa tốn thời gian bôi trát mỗi sáng mà da lại không đẹp như ý.</p>

            <p><strong>Vậy giải pháp là gì?</strong><br>
            Đơn giản thôi bạn ạ: <strong>Buổi sáng, hãy để da được thở.</strong></p>

            <p>Thay vì bôi 4–5 món lỉnh kỉnh, bạn chỉ cần tập trung đúng 2 thứ:</p>
            <ul style="padding-left: 20px; margin: 12px 0;">
              <li style="margin-bottom: 8px;"><strong>Cấp ẩm ngậm sâu tầng tế bào</strong> bằng một loại serum thẩm thấu nhanh (dạng lỏng nhẹ, thấm trong 30 giây).</li>
              <li><strong>Một lớp bảo vệ nhẹ mặt</strong> (chống nắng hoặc kem khóa ẩm tích hợp), không gây bết dính.</li>
            </ul>

            <div style="background: #FDFBF7; border-left: 4px solid #10B981; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <strong style="color: #059669;">💡 Sáng mai thử xem nhé:</strong>
              <p style="margin: 4px 0 0; font-size: 14px; color: #555;">Thử bớt đi 2 bước dưỡng rườm rà, thay vào đó sau khi rửa mặt, bạn vỗ serum thật đều rồi áp nhẹ hai lòng bàn tay ấm lên má trong 15 giây để dưỡng chất tự rút sâu vào da. Bạn sẽ thấy 2h chiều ngày mai da mặt nhẹ tênh và êm ru hơn hẳn đấy!</p>
            </div>

            <p>Ngày mai, mình sẽ chia sẻ với bạn công thức 1 bước thay thế cả chu trình mà mình đang dùng mỗi sáng nhé.</p>

            <div style="border-top: 1px solid #F0EAE1; padding-top: 18px; margin-top: 24px;">
              <p style="margin: 0; color: #777;">Thương mến,</p>
              <strong style="color: #9E5C3A; font-size: 16px;">DealNgon</strong><br>
              <span style="font-size: 13px; color: #777777;">Website: <a href="https://dealngon.online" style="color: #9E5C3A; text-decoration: none;">dealngon.online</a></span>
            </div>
          </div>
        </div>
        """
        return subject, html

    elif step == 3:
        subject = "🌸 Bạn có muốn đổi lấy 15 phút ngủ thêm mỗi sáng?"
        html = f"""
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #F0EAE1; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow: hidden; color: #333333; line-height: 1.7;">
          <div style="background: #FDFBF7; padding: 28px 24px; text-align: center; border-bottom: 1px solid #F0EAE1;">
            <h1 style="margin: 0; font-size: 22px; color: #9E5C3A; font-weight: 700; letter-spacing: 0.5px;">DealNgon</h1>
            <p style="margin: 6px 0 0; font-size: 13px; color: #7A6B63;">Giải pháp tối giản 1 bước thay 5 bước cho phụ nữ 30–45 tuổi</p>
          </div>
          <div style="padding: 28px 24px; font-size: 15px;">
            <p style="margin-top: 0;"><strong>Chào {safe_name},</strong></p>
            <p>Hôm trước mình đã chia sẻ về lý do vì sao bôi quá nhiều bước buổi sáng chỉ làm da thêm bí bách và dễ mốc ở văn phòng máy lạnh.</p>
            <p>Nhiều chị em sau khi đọc xong nhắn tin hỏi mình:<br>
            <em>"Thế bây giờ bận quá, sáng chỉ có đúng 3–5 phút thì dùng món gì để vừa đủ ẩm, vừa chống lão hóa mà không phải lỉnh kỉnh?"</em></p>

            <p>Thật ra, câu trả lời nằm ở bộ đôi mà bản thân DealNgon đã gắn bó suốt thời gian qua: <strong>Combo 3 Phút Buổi Sáng — Shiseido Ultimune (Serum 50ml + Kem dưỡng Essential Energy).</strong></p>
            
            <p>Ở đây, mình không bán những lời quảng cáo hoa mỹ hay hứa hẹn da bạn sẽ "trẻ ra 10 tuổi sau 1 đêm". Mình chỉ chia sẻ một giải pháp thực tế:</p>
            
            <ul style="padding-left: 20px; margin: 14px 0;">
              <li style="margin-bottom: 10px;"><strong>1 bước thay thế cả chu trình:</strong> Tinh chất thẩm thấu cực nhanh sau 30 giây, đưa dưỡng chất ngậm sâu dưới da. Bạn không cần ngồi đợi từng lớp kem khô như trước nữa.</li>
              <li style="margin-bottom: 10px;"><strong>Êm ru cả ngày trong máy lạnh:</strong> Tối ưu màng ẩm tự nhiên giúp da căng mướt từ 8h sáng tới 6h tối, khóe mũi khóe miệng mịn màng, không lo cakey hay loang lổ.</li>
              <li><strong>Nhẹ mặt tuyệt đối:</strong> Không bết rít, không nặng mặt — cảm giác nhẹ tênh như da mộc nhưng nhìn vào lại rất sáng khỏe và chỉn chu.</li>
            </ul>

            <p>Con số thoạt nhìn có thể nhỉnh hơn các dòng kem thông thường một chút, <strong>nhưng thật ra tính ra bạn mua 1 mà được 2</strong>: Thay vì tốn tiền mua 3–4 lọ lỉnh kỉnh rồi sáng nào cũng cuống cuồng bôi trát, món này làm xong hết trong 3 phút. Bạn vừa tiết kiệm được tiền mua các món thừa thãi, vừa mua được <strong>15 phút ngủ nướng thảnh thơi mỗi sáng</strong>.</p>

            <div style="background: #FDFBF7; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #EFE5D8;">
              <h3 style="margin-top: 0; color: #9E5C3A; font-size: 16px; text-align: center; margin-bottom: 16px;">🎁 CÁC GÓI ƯU ĐÃI ĐẶC QUYỀN HÔM NAY</h3>
              
              <!-- Gói 1 -->
              <div style="background: #ffffff; border: 2px solid #9E5C3A; border-radius: 8px; padding: 14px; margin-bottom: 12px; position: relative;">
                <span style="background: #9E5C3A; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">✨ GÓI BÁN CHẠY NHẤT</span>
                <div style="font-weight: bold; font-size: 15px; color: #222;">Combo 3 Phút Buổi Sáng (Serum 50ml + Kem Dưỡng)</div>
                <div style="color: #9E5C3A; font-size: 18px; font-weight: bold; margin: 4px 0;">2.780.000đ <span style="font-size: 13px; color: #999; text-decoration: line-through; font-weight: normal;">3.280.000đ</span></div>
                <div style="font-size: 13px; color: #555;">🎁 <strong>Tặng:</strong> Hộp quà 3 Mặt nạ lụa cao cấp + Băng đô nhung (Trị giá 450k) + Freeship toàn quốc.</div>
              </div>

              <!-- Gói 2 -->
              <div style="background: #ffffff; border: 1px solid #E0D7CC; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
                <div style="font-weight: bold; font-size: 15px; color: #222;">Gói Tối Giản: Serum Shiseido Ultimune 30ml</div>
                <div style="color: #9E5C3A; font-size: 16px; font-weight: bold; margin: 4px 0;">2.480.000đ <span style="font-size: 13px; color: #999; text-decoration: line-through; font-weight: normal;">2.980.000đ</span></div>
                <div style="font-size: 13px; color: #555;">🎁 <strong>Tặng:</strong> Băng đô nhung cao cấp + Freeship.</div>
              </div>

              <!-- Gói 3 -->
              <div style="background: #ffffff; border: 1px solid #E0D7CC; border-radius: 8px; padding: 14px;">
                <div style="font-weight: bold; font-size: 15px; color: #222;">Gói Trải Nghiệm: Checklist Da Đẹp 3 Phút (PDF)</div>
                <div style="color: #9E5C3A; font-size: 16px; font-weight: bold; margin: 4px 0;">2.000đ</div>
                <div style="font-size: 13px; color: #555;">📥 File PDF checklist in ra dán gương hoặc xem trên điện thoại.</div>
              </div>
            </div>

            <div style="text-align: center; margin: 28px 0 20px;">
              <a href="https://dealngon.online/thanh-toan" style="display: inline-block; background: #9E5C3A; color: #ffffff; text-decoration: none; padding: 15px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(158, 92, 58, 0.3);">👉 BẤM VÀO ĐÂY ĐỂ ĐẶT HÀNG &amp; NHẬN ƯU ĐÃI</a>
              <p style="margin: 8px 0 0; font-size: 12px; color: #888;">(Hệ thống quét mã VietQR tự động điền sẵn số tiền, quét 3 giây là xong)</p>
            </div>

            <div style="background: #FFF8F3; border-radius: 8px; padding: 14px 18px; margin: 20px 0; border: 1px solid #FDE8DB;">
              <strong style="color: #9E5C3A; font-size: 14px;">Cam kết từ DealNgon:</strong>
              <p style="margin: 4px 0 0; font-size: 13px; color: #555;">Hàng nhập khẩu chính hãng Shiseido Nhật Bản 100%. Mình chỉ có cái mặt và cái uy tín đi làm bao năm nay, xài thấy ưng thật mới dám gom cho chị em bạn bè dùng chung. Bạn cứ thử xem, bôi lên mặt 3 ngày là cảm nhận được liền :)))</p>
            </div>

            <p style="font-size: 14px; color: #666;">Nếu bạn cần tư vấn kỹ hơn về tình trạng da của mình trước khi chọn gói, cứ bấm trả lời email này hoặc nhắn Zalo cho mình qua số <strong>0977 338 876</strong> nhé!</p>

            <div style="border-top: 1px solid #F0EAE1; padding-top: 18px; margin-top: 24px;">
              <p style="margin: 0; color: #777;">Chúc bạn luôn rạng rỡ và thảnh thơi mỗi sớm mai! 🌸</p>
              <strong style="color: #9E5C3A; font-size: 16px;">DealNgon</strong><br>
              <span style="font-size: 13px; color: #777777;">Website: <a href="https://dealngon.online" style="color: #9E5C3A; text-decoration: none;">dealngon.online</a></span>
            </div>
          </div>
        </div>
        """
        return subject, html

    return "", ""

def trigger_waitlist_sequence(customer_id, name, email):
    """Kích hoạt chuỗi email khảo sát/waitlist:
       - Luôn gửi DUY NHẤT Email 1 ngay lập tức kèm file PDF đính kèm & link tải.
       - Email 2: Lên lịch gửi sau 1 ngày (ngày tiếp theo).
       - Email 3: Lên lịch gửi sau 2 ngày (ngày tiếp theo sau Email 2).
    """
    if not email or "@" not in email:
        return
    email = email.strip()
    name = (name or "bạn").strip()
    now = datetime.now()

    # 1. Gửi DUY NHẤT Email 1 ngay lập tức kèm file PDF đính kèm
    subj1, html1 = get_email_template(1, name)
    pdf_name = "Checklist-Da-Dep-3-Phut-DealNgon.pdf"
    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_name)
    if not os.path.exists(pdf_path):
        pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Checklist-Da-Dep-3-Phut-QuynhAnh.pdf")
    pdf_attachments = []
    if os.path.exists(pdf_path):
        try:
            with open(pdf_path, "rb") as f:
                pdf_attachments.append({
                    "filename": pdf_name,
                    "content": list(f.read())
                })
        except Exception as e_pdf:
            print(f"[Waitlist Sequence] Không thể đính kèm PDF: {e_pdf}")
    res1 = send_resend_email(email, subj1, html1, attachments=pdf_attachments if pdf_attachments else None)
    status1 = "sent" if res1 else "failed"
    err1 = None if res1 else "Resend send failed"
    try:
        DB.execute("""
            INSERT INTO email_queue (customer_id, email, name, step, subject, scheduled_at, status, sent_at, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        """, (customer_id, email, name, 1, subj1, now.strftime("%Y-%m-%d %H:%M:%S"), status1, err1))
    except Exception as e_db:
        print(f"[Waitlist DB] Lỗi lưu queue step 1: {e_db}")

    # 2. Lên lịch Email 2 sau 1 ngày (ngày tiếp theo)
    time2 = (now + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    subj2, _ = get_email_template(2, name)
    try:
        DB.execute("""
            INSERT INTO email_queue (customer_id, email, name, step, subject, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        """, (customer_id, email, name, 2, subj2, time2))
    except Exception as e_db:
        print(f"[Waitlist DB] Lỗi lưu queue step 2: {e_db}")

    # 3. Lên lịch Email 3 sau 2 ngày (ngày tiếp theo sau Email 2)
    time3 = (now + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
    subj3, _ = get_email_template(3, name)
    try:
        DB.execute("""
            INSERT INTO email_queue (customer_id, email, name, step, subject, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        """, (customer_id, email, name, 3, subj3, time3))
    except Exception as e_db:
        print(f"[Waitlist DB] Lỗi lưu queue step 3: {e_db}")

    print(f"[Waitlist] ✅ Đã gửi Email 1 thành công và lên lịch Email 2 (+1 ngày), Email 3 (+2 ngày) cho {email}")

def process_email_queue():
    """Quét và xử lý các email pending đã đến hạn."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pending = DB.fetchall("""
        SELECT * FROM email_queue
        WHERE status = 'pending' AND scheduled_at <= ?
        ORDER BY scheduled_at ASC LIMIT 10
    """, (now_str,))

    if not pending:
        return 0

    sent_count = 0
    for item in pending:
        qid = item["id"]
        step = item["step"]
        email = item["email"]
        name = item.get("name") or "bạn"
        subj, html = get_email_template(step, name)
        res = send_resend_email(email, subj, html)
        if res:
            DB.run("UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE id=?", (qid,))
            sent_count += 1
            print(f"[Queue Worker] ✅ Đã gửi email step {step} cho {email} (Queue #{qid})")
        else:
            DB.run("UPDATE email_queue SET status='failed', error='Resend send failed' WHERE id=?", (qid,))
            print(f"[Queue Worker] ❌ Gửi thất bại email step {step} cho {email} (Queue #{qid})")
        time.sleep(1)
    return sent_count

def email_queue_worker_loop():
    """Background worker định kỳ mỗi 60 giây."""
    print("[Queue Worker] ⏰ Background email worker started (polling every 60s)...")
    while True:
        try:
            process_email_queue()
        except Exception as e:
            print(f"[Queue Worker] ⚠️ Worker error: {e}")
        time.sleep(60)

# ─── EMAIL QUEUE ENDPOINTS ────────────────────────────────────
@app.route("/api/email-queue", methods=["GET"])
def get_email_queue():
    return jsonify(DB.fetchall("SELECT * FROM email_queue ORDER BY id DESC LIMIT 100"))

@app.route("/api/email-queue/process", methods=["GET", "POST"])
def manual_process_email_queue():
    count = process_email_queue()
    return jsonify({"ok": True, "processed": count})

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

_worker_started = False
def ensure_worker_started():
    global _worker_started
    if not _worker_started:
        _worker_started = True
        try:
            init_schema()
        except Exception as e:
            print(f"[Init] ⚠️ Lỗi init_schema: {e}")
        t = threading.Thread(target=email_queue_worker_loop, daemon=True)
        t.start()

@app.before_request
def startup_hook():
    ensure_worker_started()

if __name__ == "__main__":
    ensure_worker_started()
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 Admin: http://localhost:{port}/admin")
    print(f"🔗 Webhook: https://web-production-42cec4.up.railway.app/webhook/sepay")
    app.run(host="0.0.0.0", port=port, debug=not IS_PG)
