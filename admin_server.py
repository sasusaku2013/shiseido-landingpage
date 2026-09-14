"""
admin_server.py — Admin Panel cho brain.db
Chạy: python3 admin_server.py
Mở:  http://localhost:5001/admin
"""
import sqlite3, os, json
from datetime import datetime
from flask import Flask, jsonify, request, render_template_string, abort

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brain.db")

# ─── DB helper ────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def rows_to_list(rows):
    return [dict(r) for r in rows]

# ─── PRODUCTS API ─────────────────────────────────────────────
@app.route("/api/products", methods=["GET"])
def get_products():
    with get_db() as db:
        rows = db.execute("SELECT * FROM products ORDER BY id").fetchall()
    return jsonify(rows_to_list(rows))

@app.route("/api/products", methods=["POST"])
def create_product():
    d = request.json
    ptype = d.get("type","physical")
    stock = d.get("stock")
    if ptype != "physical":
        stock = None  # digital/service không có tồn kho
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO products(name,type,price,description,stock,is_active) VALUES(?,?,?,?,?,1)",
            (d["name"], ptype, int(d["price"]), d.get("description",""), stock)
        )
        db.commit()
        row = db.execute("SELECT * FROM products WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201

@app.route("/api/products/<int:pid>", methods=["PUT"])
def update_product(pid):
    d = request.json
    ptype = d.get("type","physical")
    stock = d.get("stock")
    if ptype != "physical":
        stock = None
    with get_db() as db:
        db.execute(
            "UPDATE products SET name=?,type=?,price=?,description=?,stock=?,is_active=? WHERE id=?",
            (d["name"], ptype, int(d["price"]), d.get("description",""), stock, d.get("is_active",1), pid)
        )
        db.commit()
        row = db.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    if not row: abort(404)
    return jsonify(dict(row))

@app.route("/api/products/<int:pid>", methods=["DELETE"])
def delete_product(pid):
    with get_db() as db:
        db.execute("DELETE FROM products WHERE id=?", (pid,))
        db.commit()
    return jsonify({"ok": True})

# ─── CUSTOMERS API ────────────────────────────────────────────
@app.route("/api/customers", methods=["GET"])
def get_customers():
    with get_db() as db:
        rows = db.execute("SELECT * FROM customers ORDER BY id DESC").fetchall()
    return jsonify(rows_to_list(rows))

@app.route("/api/customers", methods=["POST"])
def create_customer():
    d = request.json
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO customers(name,phone,zalo,email,source,notes) VALUES(?,?,?,?,?,?)",
            (d["name"], d["phone"], d.get("zalo",d["phone"]), d.get("email"), d.get("source","manual"), d.get("notes"))
        )
        db.commit()
        row = db.execute("SELECT * FROM customers WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201

@app.route("/api/customers/<int:cid>", methods=["PUT"])
def update_customer(cid):
    d = request.json
    with get_db() as db:
        db.execute(
            "UPDATE customers SET name=?,phone=?,zalo=?,email=?,source=?,notes=? WHERE id=?",
            (d["name"], d["phone"], d.get("zalo",d["phone"]), d.get("email"), d.get("source","manual"), d.get("notes"), cid)
        )
        db.commit()
        row = db.execute("SELECT * FROM customers WHERE id=?", (cid,)).fetchone()
    if not row: abort(404)
    return jsonify(dict(row))

@app.route("/api/customers/<int:cid>", methods=["DELETE"])
def delete_customer(cid):
    with get_db() as db:
        db.execute("DELETE FROM customers WHERE id=?", (cid,))
        db.commit()
    return jsonify({"ok": True})

# ─── ORDERS API ───────────────────────────────────────────────
@app.route("/api/orders", methods=["GET"])
def get_orders():
    with get_db() as db:
        rows = db.execute("""
            SELECT o.*,
                   c.name AS cname, c.phone AS cphone,
                   p.name AS pname, p.type AS ptype
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN products  p ON o.product_id  = p.id
            ORDER BY o.id DESC
        """).fetchall()
    return jsonify(rows_to_list(rows))

@app.route("/api/orders", methods=["POST"])
def create_order():
    d = request.json
    product_id = d.get("product_id")
    with get_db() as db:
        # Lấy thông tin sản phẩm
        product = None
        if product_id:
            product = db.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()

        # Trừ tồn kho CHỈ khi: sản phẩm vật lý VÀ stock không phải NULL
        if product and dict(product)["type"] == "physical" and dict(product)["stock"] is not None:
            new_stock = dict(product)["stock"] - 1
            if new_stock < 0:
                return jsonify({"error": "Hết hàng!"}), 400
            db.execute("UPDATE products SET stock=? WHERE id=?", (new_stock, product_id))

        # Lấy tên sản phẩm/khách hàng để backup
        product_name = dict(product)["name"] if product else d.get("product_name","")
        customer = None
        if d.get("customer_id"):
            customer = db.execute("SELECT * FROM customers WHERE id=?", (d["customer_id"],)).fetchone()
        cname  = dict(customer)["name"]  if customer else d.get("customer_name","")
        cphone = dict(customer)["phone"] if customer else d.get("customer_phone","")

        cur = db.execute("""
            INSERT INTO orders(customer_id,customer_name,customer_phone,
                               product_id,product_name,amount,status,
                               payment_method,payment_ref,address,notes)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
        """, (
            d.get("customer_id"), cname, cphone,
            product_id, product_name,
            int(d["amount"]),
            d.get("status","pending"),
            d.get("payment_method","cod"),
            d.get("payment_ref",""),
            d.get("address",""),
            d.get("notes","")
        ))
        db.commit()
        row = db.execute("SELECT * FROM orders WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201

@app.route("/api/orders/<int:oid>", methods=["PUT"])
def update_order(oid):
    d = request.json
    with get_db() as db:
        db.execute("""
            UPDATE orders SET customer_id=?,customer_name=?,customer_phone=?,
                              product_id=?,product_name=?,amount=?,status=?,
                              payment_method=?,payment_ref=?,address=?,notes=?,
                              updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        """, (
            d.get("customer_id"), d.get("customer_name",""), d.get("customer_phone",""),
            d.get("product_id"), d.get("product_name",""),
            int(d["amount"]), d.get("status","pending"),
            d.get("payment_method","cod"), d.get("payment_ref",""),
            d.get("address",""), d.get("notes",""), oid
        ))
        db.commit()
        row = db.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not row: abort(404)
    return jsonify(dict(row))

@app.route("/api/orders/<int:oid>", methods=["DELETE"])
def delete_order(oid):
    with get_db() as db:
        db.execute("DELETE FROM orders WHERE id=?", (oid,))
        db.commit()
    return jsonify({"ok": True})

# ─── ADMIN HTML ───────────────────────────────────────────────
ADMIN_HTML = open(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "admin.html"),
    encoding="utf-8"
).read()

@app.route("/admin")
@app.route("/admin/")
def admin():
    return ADMIN_HTML

@app.route("/")
def root():
    return '<meta http-equiv="refresh" content="0;url=/admin">'

if __name__ == "__main__":
    print("🚀 Admin Panel: http://localhost:5001/admin")
    app.run(host="0.0.0.0", port=5001, debug=True)
