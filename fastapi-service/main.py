from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from PIL import Image, UnidentifiedImageError
import os, re, json

app = FastAPI(title="CivicTrack ML Service", version="1.0.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

_classifier = None
_claude = None
MAX_IMAGE_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


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
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")
        _claude = anthropic.Anthropic(api_key=api_key)
    return _claude


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    conversation_history: list[dict] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    reply: str
    suggested_report: Optional[dict] = None


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(415, "Only image uploads are supported")

    contents = await file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is too large; maximum size is 10 MB")

    try:
        with Image.open(__import__('io').BytesIO(contents)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, "Invalid or unsafe image file") from exc

    try:
        clf = get_classifier()
        return clf.predict(contents)
    except Exception as exc:
        raise HTTPException(503, "ML model unavailable") from exc


@app.post("/chat", response_model=ChatResponse)
async def chat_intake(req: ChatRequest):
    try:
        claude = get_claude()
    except Exception as exc:
        raise HTTPException(503, "LLM unavailable") from exc

    safe_history = []
    for item in req.conversation_history:
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            raise HTTPException(400, "Invalid conversation history")
        safe_history.append({"role": role, "content": content[:5000]})

    system = """You are a helpful assistant for CivicTrack, a civic issue reporting platform.
Help citizens report local problems. When ready, output:
```json
{"title":"...","description":"...","category":"road_damage|water_leak|electrical|garbage|graffiti|noise|emergency|other"}
```"""

    messages = safe_history + [{"role": "user", "content": req.message}]
    response = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        system=system,
        messages=messages,
    )
    reply = response.content[0].text
    suggested = None
    match = re.search(r'```json\s*(.*?)\s*```', reply, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if isinstance(parsed, dict):
                suggested = parsed
        except (json.JSONDecodeError, TypeError):
            pass

    return ChatResponse(reply=reply, suggested_report=suggested)
