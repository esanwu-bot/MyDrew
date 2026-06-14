"""
Drew Embedding Service - BGE-M3 based text embedding microservice.
Provides a REST API for generating dense vectors from text using the
BAAI/bge-m3 model for multilingual semantic search.
"""

import os
import time
import logging
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

logger = logging.getLogger(__name__)

# Configuration
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
HOST = os.getenv("EMBEDDING_HOST", "0.0.0.0")
PORT = int(os.getenv("EMBEDDING_PORT", "8090"))
DEVICE = os.getenv("EMBEDDING_DEVICE", "cpu")  # cpu or cuda

# Lazy-loaded model
_model = None

app = FastAPI(title="Drew Embedding Service", version="0.2.0")


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimension: int


def get_model():
    """Lazy-load the embedding model on first request."""
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {MODEL_NAME} on {DEVICE}")
        try:
            from FlagEmbedding import BGEM3FlagModel
            _model = BGEM3FlagModel(
                MODEL_NAME,
                use_fp16=(DEVICE != "cpu"),
                device=DEVICE,
            )
            logger.info("BGE-M3 model loaded successfully")
        except ImportError:
            logger.info("FlagEmbedding not available, falling back to sentence-transformers")
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(MODEL_NAME, device=DEVICE)
            logger.info("SentenceTransformer model loaded successfully")
    return _model


@app.on_event("startup")
async def startup():
    """Pre-load model on startup for faster first request."""
    logger.info("Drew Embedding Service starting...")
    try:
        get_model()
    except Exception as e:
        logger.warning(f"Model pre-loading failed (will retry on request): {e}")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "drew-embedding",
        "model": MODEL_NAME,
        "device": DEVICE,
    }


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """Generate dense embeddings for the given texts."""
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    start = time.time()
    try:
        model = get_model()

        # Handle both FlagEmbedding and SentenceTransformer interfaces
        if hasattr(model, 'encode') and hasattr(model, 'colbert_weight'):
            # FlagEmbedding BGEM3FlagModel
            output = model.encode(request.texts, return_dense=True)
            embeddings = output['dense_vecs'].tolist()
        else:
            # SentenceTransformer
            output = model.encode(request.texts, normalize_embeddings=True)
            embeddings = output.tolist()

        elapsed = (time.time() - start) * 1000
        dimension = len(embeddings[0]) if embeddings else 0

        logger.info(f"Embedded {len(request.texts)} texts in {elapsed:.1f}ms (dim={dimension})")

        return EmbedResponse(
            embeddings=embeddings,
            model=MODEL_NAME,
            dimension=dimension,
        )
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(app, host=HOST, port=PORT)
