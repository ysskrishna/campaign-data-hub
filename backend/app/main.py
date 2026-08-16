from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deliveries import router as deliveries_router
from app.api.ingest import router as ingest_router
from app.api.metrics import router as metrics_router
from app.db import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Campaign Data Hub", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(metrics_router)
app.include_router(deliveries_router)
