# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import os
from dotenv import load_dotenv

# 导入你的核心算法（需要先移植）
# 注意：这里需要先把 life-validation 的 core 算法移植过来
# from life_validation_core import confidence, conflict

load_dotenv()

app = FastAPI(
    title="Life Validation Network",
    description="Decentralized memory validation service for AI agents",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求/响应模型
class ValidateRequest(BaseModel):
    text: str
    source_type: Optional[str] = "user_implicit"
    timestamp: Optional[str] = None
    context: Optional[Dict[str, Any]] = {}

class ValidateResponse(BaseModel):
    confidence: float
    source_type: str
    timestamp: str
    warnings: List[str] = []

class ConflictRequest(BaseModel):
    new_memories: List[Dict[str, Any]]
    existing_memories: List[Dict[str, Any]]

class ConflictResponse(BaseModel):
    conflicts: List[Dict[str, Any]]
    count: int

class ResolutionFeedback(BaseModel):
    conflict_id: str
    new_memory: str
    old_memory: str
    decision: str  # "保留旧", "保留新", "合并"
    user_hash: str  # 匿名用户ID
    timestamp: str

@app.get("/")
async def root():
    return {
        "service": "Life Validation Network",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }

@app.get("/v1/health")
async def health():
    return {"status": "healthy"}

@app.post("/v1/validate", response_model=ValidateResponse)
async def validate(request: ValidateRequest):
    """
    验证单条记忆的可信度
    """
    # TODO: 调用你的 confidence 算法
    # 临时返回示例数据
    return {
        "confidence": 0.85,
        "source_type": request.source_type,
        "timestamp": request.timestamp or "2026-03-14T00:00:00Z",
        "warnings": []
    }

@app.post("/v1/detect-conflict", response_model=ConflictResponse)
async def detect_conflict(request: ConflictRequest):
    """
    检测记忆冲突
    """
    # TODO: 调用你的 conflict 检测算法
    # 临时返回示例数据
    return {
        "conflicts": [
            {
                "id": "conflict_001",
                "keyword": "小龙虾",
                "old_memory": "我喜欢吃小龙虾",
                "new_memory": "我不喜欢吃小龙虾",
                "severity": "medium"
            }
        ],
        "count": 1
    }

@app.post("/v1/resolve-feedback")
async def resolve_feedback(feedback: ResolutionFeedback):
    """
    接收用户裁决反馈（匿名）
    这是你数据飞轮的核心
    """
    # TODO: 将数据保存到数据库
    # 临时返回成功
    return {"status": "received", "conflict_id": feedback.conflict_id}

@app.get("/v1/.well-known/validator.json")
async def validator_info():
    """
    公开的验证者注册信息
    符合 LVP 协议
    """
    return {
        "validator_name": "Life Validation Network",
        "version": "1.0.0",
        "description": "Decentralized memory validation service for AI agents",
        "api_endpoint": "https://api.life-validation.net/v1",
        "capabilities": ["confidence_scoring", "conflict_detection"],
        "fee_model": "freemium",
        "public_key": os.getenv("PUBLIC_KEY", "pending"),
        "docs_url": "https://github.com/znsyhandao/life-validation-service"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)