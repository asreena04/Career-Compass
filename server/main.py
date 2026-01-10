from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- App setup ---
app = FastAPI(title="CV Generator API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Model ---
class CVForm(BaseModel):
    name: str
    email: str
    skills: str

# --- Routes ---
@app.post("/api/cv")
async def generate_cv(form: CVForm):
    """
    Receive CV form data from React frontend.
    In the future, you could generate a PDF here.
    """
    # For now, just return the same data
    return {
        "message": "CV data received successfully!",
        "name": form.name,
        "email": form.email,
        "skills": form.skills
    }

@app.get("/")
def root():
    return {"message": "CV Generator Backend is running!"}
