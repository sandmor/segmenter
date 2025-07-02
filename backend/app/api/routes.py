from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Item(BaseModel):
    name: str
    description: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

@router.get("/items", response_model=list[ItemResponse])
async def get_items():
    return [
        {"id": 1, "name": "Item 1", "description": "First item"},
        {"id": 2, "name": "Item 2", "description": "Second item"},
    ]

@router.post("/items", response_model=ItemResponse)
async def create_item(item: Item):
    return {"id": 3, **item.dict()}