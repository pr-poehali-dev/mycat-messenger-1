import os
import json
import hashlib
import secrets
import psycopg
import re

SCHEMA = "t_p80382263_mycat_messenger_1"
AVATAR_COLORS = ["#2e6fdb","#7c3aed","#059669","#d97706","#db2777","#0891b2","#dc2626","#65a30d"]

def get_db():
    return psycopg.connect(os.environ["DATABASE_URL"])

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{password}mycat_salt_2024".encode()).hexdigest()

def gen_token() -> str:
    return secrets.token_hex(32)

def avatar_letter(name: str) -> str:
    return name.strip()[0].upper() if name.strip() else "?"

def avatar_color(uid: int) -> str:
    return AVATAR_COLORS[uid % len(AVATAR_COLORS)]

def json_resp(data, status=200):
    body = json.dumps(data, default=str).encode()
    return {"statusCode": status, "body": body.decode(), "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization"}}

def get_user(db, token):
    if not token:
        return None
    cur = db.execute(f"SELECT u.* FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()", [token])
    row = cur.fetchone()
    if not row:
        return None
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row))

def handler(request, context):
    method = request.get("method", "GET").upper()
    raw_path = request.get("path", "/")
    # Normalize path: strip leading /api prefix if present
    if raw_path.startswith("/api"):
        path = raw_path[4:]
    else:
        path = raw_path
    path = path.rstrip("/") or "/"
    if not path.startswith("/"):
        path = "/" + path
    headers = request.get("headers", {})
    body_str = request.get("body", "")
    body = {}
    if body_str:
        try:
            body = json.loads(body_str)
        except Exception:
            pass
    query = request.get("query", {})
    auth_header = headers.get("Authorization", headers.get("authorization", ""))
    token = auth_header.replace("Bearer ", "").strip() if auth_header else None

    if method == "OPTIONS":
        return json_resp({}, 204)

    db = get_db()
    try:
        # REGISTER
        if path == "/auth/register" and method == "POST":
            phone = body.get("phone", "").strip()
            name = body.get("name", "").strip()
            password = body.get("password", "")
            username = body.get("username", "").strip().lower() or None

            if not phone or not name or not password:
                return json_resp({"error": "Заполните все поля"}, 400)

            cur = db.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", [phone])
            if cur.fetchone():
                return json_resp({"error": "Этот номер уже зарегистрирован"}, 400)

            if username:
                cur = db.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", [username])
                if cur.fetchone():
                    return json_resp({"error": "Этот никнейм уже занят"}, 400)

            pw_hash = hash_password(password)
            letter = avatar_letter(name)
            cur = db.execute(
                f"INSERT INTO {SCHEMA}.users (phone, name, username, password_hash, avatar_letter, online) VALUES (%s,%s,%s,%s,%s,true) RETURNING id,name,phone,username,avatar_letter,bio,avatar_color",
                [phone, name, username, pw_hash, letter]
            )
            cols = [d[0] for d in cur.description]
            user = dict(zip(cols, cur.fetchone()))
            color = avatar_color(user["id"])
            db.execute(f"UPDATE {SCHEMA}.users SET avatar_color = %s WHERE id = %s", [color, user["id"]])
            user["avatar_color"] = color

            tok = gen_token()
            db.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", [user["id"], tok])
            db.commit()
            return json_resp({"token": tok, "user": user})

        # LOGIN
        if path == "/auth/login" and method == "POST":
            phone = body.get("phone", "").strip()
            password = body.get("password", "")
            if not phone or not password:
                return json_resp({"error": "Заполните все поля"}, 400)
            pw_hash = hash_password(password)
            cur = db.execute(f"SELECT * FROM {SCHEMA}.users WHERE phone = %s AND password_hash = %s", [phone, pw_hash])
            row = cur.fetchone()
            if not row:
                return json_resp({"error": "Неверный номер или пароль"}, 401)
            cols = [d[0] for d in cur.description]
            user = dict(zip(cols, row))
            db.execute(f"UPDATE {SCHEMA}.users SET online = true, last_seen = NOW() WHERE id = %s", [user["id"]])
            tok = gen_token()
            db.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", [user["id"], tok])
            db.commit()
            return json_resp({"token": tok, "user": user})

        # LOGOUT
        if path == "/auth/logout" and method == "POST":
            if token:
                u = get_user(db, token)
                if u:
                    db.execute(f"UPDATE {SCHEMA}.users SET online = false WHERE id = %s", [u["id"]])
                db.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", [token])
                db.commit()
            return json_resp({"ok": True})

        # ME
        if path == "/auth/me" and method == "GET":
            user = get_user(db, token)
            if not user:
                return json_resp({"error": "Unauthorized"}, 401)
            return json_resp({"user": user})

        # SEARCH USERS
        if path == "/users/search" and method == "GET":
            user = get_user(db, token)
            if not user:
                return json_resp({"error": "Unauthorized"}, 401)
            q = query.get("q", "").strip()
            if len(q) < 2:
                return json_resp({"users": []})
            cur = db.execute(
                f"SELECT id, name, username, phone, avatar_letter, avatar_color, online, last_seen FROM {SCHEMA}.users WHERE id != %s AND (name ILIKE %s OR username ILIKE %s OR phone LIKE %s) LIMIT 20",
                [user["id"], f"%{q}%", f"%{q}%", f"%{q}%"]
            )
            cols = [d[0] for d in cur.description]
            users = [dict(zip(cols, r)) for r in cur.fetchall()]
            return json_resp({"users": users})

        # UPDATE PROFILE
        if path == "/users/me" and method == "PATCH":
            user = get_user(db, token)
            if not user:
                return json_resp({"error": "Unauthorized"}, 401)
            name = body.get("name", user["name"])
            bio = body.get("bio", user.get("bio", ""))
            username = body.get("username")
            if username is not None:
                username = username.strip().lower() or None
                if username:
                    cur = db.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s AND id != %s", [username, user["id"]])
                    if cur.fetchone():
                        return json_resp({"error": "Этот никнейм уже занят"}, 400)
            else:
                username = user.get("username")
            letter = avatar_letter(name)
            db.execute(
                f"UPDATE {SCHEMA}.users SET name=%s, username=%s, bio=%s, avatar_letter=%s WHERE id=%s",
                [name, username, bio, letter, user["id"]]
            )
            db.commit()
            cur = db.execute(f"SELECT * FROM {SCHEMA}.users WHERE id = %s", [user["id"]])
            cols = [d[0] for d in cur.description]
            updated = dict(zip(cols, cur.fetchone()))
            return json_resp({"user": updated})

        # GET CHATS
        if path == "/chats" and method == "GET":
            me = get_user(db, token)
            if not me:
                return json_resp({"error": "Unauthorized"}, 401)

            cur = db.execute(f"""
                SELECT
                    c.id, c.type, c.name, c.description, c.avatar_letter, c.avatar_color, c.created_at,
                    cm.last_read_at,
                    (SELECT text FROM {SCHEMA}.messages m WHERE m.chat_id = c.id AND m.is_removed = false ORDER BY m.created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM {SCHEMA}.messages m WHERE m.chat_id = c.id AND m.is_removed = false ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
                    (SELECT sender_id FROM {SCHEMA}.messages m WHERE m.chat_id = c.id AND m.is_removed = false ORDER BY m.created_at DESC LIMIT 1) as last_sender_id,
                    (SELECT COUNT(*) FROM {SCHEMA}.messages m WHERE m.chat_id = c.id AND m.is_removed = false AND m.created_at > cm.last_read_at AND m.sender_id != %s) as unread_count,
                    (SELECT COUNT(*) FROM {SCHEMA}.chat_members WHERE chat_id = c.id) as members_count
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
                ORDER BY COALESCE((SELECT created_at FROM {SCHEMA}.messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1), c.created_at) DESC
            """, [me["id"], me["id"]])
            cols = [d[0] for d in cur.description]
            chats = [dict(zip(cols, r)) for r in cur.fetchall()]

            for chat in chats:
                if chat["type"] == "private":
                    cur2 = db.execute(
                        f"SELECT u.id, u.name, u.username, u.avatar_letter, u.avatar_color, u.online, u.last_seen FROM {SCHEMA}.chat_members cm JOIN {SCHEMA}.users u ON u.id = cm.user_id WHERE cm.chat_id = %s AND cm.user_id != %s LIMIT 1",
                        [chat["id"], me["id"]]
                    )
                    row2 = cur2.fetchone()
                    if row2:
                        cols2 = [d[0] for d in cur2.description]
                        other = dict(zip(cols2, row2))
                        chat["name"] = other["name"]
                        chat["avatar_letter"] = other["avatar_letter"]
                        chat["avatar_color"] = other["avatar_color"]
                        chat["other_user"] = other

            return json_resp({"chats": chats})

        # CREATE PRIVATE CHAT
        if path == "/chats/private" and method == "POST":
            me = get_user(db, token)
            if not me:
                return json_resp({"error": "Unauthorized"}, 401)
            user_id = body.get("user_id")
            if not user_id:
                return json_resp({"error": "user_id required"}, 400)

            cur = db.execute(f"""
                SELECT c.id FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
                JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s
                WHERE c.type = 'private' LIMIT 1
            """, [me["id"], user_id])
            row = cur.fetchone()
            if row:
                return json_resp({"chat_id": row[0]})

            cur = db.execute(f"INSERT INTO {SCHEMA}.chats (type, created_by) VALUES ('private', %s) RETURNING id", [me["id"]])
            chat_id = cur.fetchone()[0]
            db.execute(f"INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s,%s),(%s,%s)", [chat_id, me["id"], chat_id, user_id])
            db.commit()
            return json_resp({"chat_id": chat_id})

        # GET MESSAGES
        msg_match = re.match(r"^/chats/(\d+)/messages$", path)
        if msg_match and method == "GET":
            me = get_user(db, token)
            if not me:
                return json_resp({"error": "Unauthorized"}, 401)
            chat_id = int(msg_match.group(1))
            cur = db.execute(f"SELECT id FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", [chat_id, me["id"]])
            if not cur.fetchone():
                return json_resp({"error": "Нет доступа"}, 403)

            since = query.get("since")
            if since:
                cur = db.execute(
                    f"SELECT m.*, u.name as sender_name, u.avatar_letter as sender_avatar, u.avatar_color as sender_color FROM {SCHEMA}.messages m LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id WHERE m.chat_id = %s AND m.is_removed = false AND m.created_at > %s ORDER BY m.created_at ASC",
                    [chat_id, since]
                )
            else:
                cur = db.execute(
                    f"SELECT m.*, u.name as sender_name, u.avatar_letter as sender_avatar, u.avatar_color as sender_color FROM {SCHEMA}.messages m LEFT JOIN {SCHEMA}.users u ON u.id = m.sender_id WHERE m.chat_id = %s AND m.is_removed = false ORDER BY m.created_at ASC LIMIT 100",
                    [chat_id]
                )
            cols = [d[0] for d in cur.description]
            messages = [dict(zip(cols, r)) for r in cur.fetchall()]
            db.execute(f"UPDATE {SCHEMA}.chat_members SET last_read_at = NOW() WHERE chat_id = %s AND user_id = %s", [chat_id, me["id"]])
            db.commit()
            return json_resp({"messages": messages})

        # SEND MESSAGE
        if msg_match and method == "POST":
            me = get_user(db, token)
            if not me:
                return json_resp({"error": "Unauthorized"}, 401)
            chat_id = int(msg_match.group(1))
            cur = db.execute(f"SELECT id FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s", [chat_id, me["id"]])
            if not cur.fetchone():
                return json_resp({"error": "Нет доступа"}, 403)
            text = (body.get("text") or "").strip()
            if not text:
                return json_resp({"error": "Пустое сообщение"}, 400)
            cur = db.execute(
                f"INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text) VALUES (%s,%s,%s) RETURNING *",
                [chat_id, me["id"], text]
            )
            cols = [d[0] for d in cur.description]
            msg = dict(zip(cols, cur.fetchone()))
            msg["sender_name"] = me["name"]
            msg["sender_avatar"] = me["avatar_letter"]
            msg["sender_color"] = me["avatar_color"]
            db.execute(f"UPDATE {SCHEMA}.chat_members SET last_read_at = NOW() WHERE chat_id = %s AND user_id = %s", [chat_id, me["id"]])
            db.commit()
            return json_resp({"message": msg})

        return json_resp({"error": "Not found"}, 404)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return json_resp({"error": str(e)}, 500)
    finally:
        db.close()