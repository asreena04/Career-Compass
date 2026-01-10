from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import io
from fpdf import FPDF, XPos, YPos
import uvicorn
import os
from supabase import create_client, Client
from datetime import datetime
from dotenv import load_dotenv

# ===================== ENV =====================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Fix Supabase storage requirement (trailing slash)
if SUPABASE_URL and not SUPABASE_URL.endswith("/"):
    SUPABASE_URL += "/"

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print("⚠️ Supabase init failed:", e)
else:
    print("⚠️ Supabase ENV not set – PDF will still work")

# ===================== APP =====================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== PDF =====================
class PDF(FPDF):
    def __init__(self, cv_data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cv_data = cv_data
        self.set_margins(15, 15, 15)
        self.add_page()
        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        self.set_font("Arial", "B", 24)
        self.cell(
            0,
            10,
            self.cv_data.get("name", "").upper(),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
            align="C",
        )
        self.ln(2)

        self.set_font("Arial", "", 10)
        contact = (
            f"{self.cv_data.get('city','')} {self.cv_data.get('state','')} | "
            f"{self.cv_data.get('email','')} | {self.cv_data.get('phoneNumber','')} | "
            f"{self.cv_data.get('linkedin','')}"
        )
        self.cell(0, 5, contact, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        self.ln(5)

    def section_title(self, title):
        self.set_font("Arial", "B", 14)
        self.cell(0, 7, title.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT, border="B")
        self.ln(3)

    def generate_to_bytes(self):
        if self.cv_data.get("careerObjective"):
            self.section_title("CAREER OBJECTIVE")
            self.set_font("Arial", "", 10)
            self.multi_cell(0, 5, self.cv_data["careerObjective"])
            self.ln(5)

        self.section_title("SKILLS")
        for label, key in [
            ("Technical Skills", "technicalSkills"),
            ("Level", "technicalLevel"),
            ("Transferable", "transferableSkills"),
        ]:
            if self.cv_data.get(key):
                self.set_font("Arial", "B", 10)
                self.cell(45, 6, f"{label}:")
                self.set_font("Arial", "", 10)
                self.multi_cell(0, 6, self.cv_data[key])
        self.ln(5)

        if self.cv_data.get("educations"):
            self.section_title("EDUCATION")
            for edu in self.cv_data["educations"]:
                self.set_font("Arial", "B", 10)
                self.cell(120, 5, edu.get("educationTitle", ""))
                self.set_font("Arial", "", 10)
                self.cell(
                    0,
                    5,
                    edu.get("educationYears", ""),
                    new_x=XPos.LMARGIN,
                    new_y=YPos.NEXT,
                    align="R",
                )
            self.ln(5)

        self._print_list(
            "ACHIEVEMENTS",
            self.cv_data.get("achievements", []),
            "achievementTitle",
            "achievementYear",
        )
        self._print_list(
            "CERTIFICATES",
            self.cv_data.get("certificates", []),
            "certificateTitle",
            "certificateYear",
        )

        if self.cv_data.get("referenceName"):
            self.section_title("REFERENCE")
            self.set_font("Arial", "", 10)
            self.multi_cell(
                0,
                5,
                f"{self.cv_data.get('referenceName')}\n"
                f"{self.cv_data.get('referenceRole')}, {self.cv_data.get('referenceDepartment')}\n"
                f"{self.cv_data.get('referenceInstitution')}\n"
                f"Email: {self.cv_data.get('referenceEmail')} | "
                f"Phone: {self.cv_data.get('referencePhoneNumber')}",
            )

        # 🔑 SAFE FPDF OUTPUT
        out = self.output(dest="S")
        if isinstance(out, (bytes, bytearray)):
            return bytes(out)
        return out.encode("latin-1")

    def _print_list(self, title, items, text_key, year_key):
        if not items:
            return
        self.section_title(title)
        self.set_font("Arial", "", 10)
        for item in items:
            self.multi_cell(0, 5, f"- {item.get(text_key,'')} ({item.get(year_key,'')})")
        self.ln(3)

# ===================== ROUTES =====================
@app.get("/")
async def home():
    return {"status": "Server running"}

@app.post("/api/cv")
async def create_cv(request: Request):
    data = await request.json()

    if not data.get("name"):
        return JSONResponse(status_code=400, content={"message": "Name is required"})

    try:
        pdf = PDF(data, orientation="P", unit="mm", format="A4")
        pdf_bytes = pdf.generate_to_bytes()

        filename = f"CV_{data['name'].replace(' ','_')}_{datetime.now():%Y%m%d_%H%M%S}.pdf"
        path = f"generated/{filename}"

        # Upload to Supabase (optional, non-blocking)
        if supabase:
            try:
                supabase.storage.from_("cvs").upload(
                    path=path,
                    file=pdf_bytes,
                    file_options={"content-type": "application/pdf"},
                )
            except Exception as e:
                print("⚠️ Supabase upload failed:", e)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"message": str(e)})

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
