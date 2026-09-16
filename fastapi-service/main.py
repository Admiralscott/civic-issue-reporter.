from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, re, json

app = FastAPI(title="CivicTrack ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_classifier = None
_claude = None

def get_classifier():
    global _classifier
    if _classifier is None:
        from models.classifier import ImageClassifier
        _classifier = ImageClassifier()
    return _classifier

def get_claude():
    global _claude
    if _claude is None:
        import anthropic
        _claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _claude

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[list] = []

class ChatResponse(BaseModel):
    reply: str
    suggested_report: Optional[dict] = None

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    try:
        clf = get_classifier()
    except Exception as e:
        raise HTTPException(503, f"ML model unavailable: {e}")
    contents = await file.read()
    try:
        return clf.predict(contents)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_intake(req: ChatRequest):
    try:
        claude = get_claude()
    except Exception as e:
        raise HTTPException(503, f"LLM unavailable: {e}")
    system = """You are a helpful assistant for CivicTrack, a civic issue reporting platform.
Help citizens report local problems. When ready, output:
```json
{"title":"...","description":"...","category":"road_damage|water_leak|electrical|garbage|graffiti|noise|emergency|other"}
```"""
    messages = req.conversation_history + [{"role": "user", "content": req.message}]
    response = claude.messages.create(model="claude-3-haiku-20240307", max_tokens=500, system=system, messages=messages)
    reply = response.content[0].text
    suggested = None
    m = re.search(r'```json\s*(.*?)\s*```', reply, re.DOTALL)
    if m:
        try: suggested = json.loads(m.group(1))
        except: pass
    return ChatResponse(reply=reply, suggested_report=suggested)
