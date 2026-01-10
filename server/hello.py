from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/hello", methods=["POST"])
def hello():
    data = request.get_json()
    return {"hello": data["name"]}