import traceback
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..services.sam2 import SAM2Service

router = APIRouter()

sam2_service = None

def get_sam2_service():
  global sam2_service
  if sam2_service is None:
      sam2_service = SAM2Service()
  return sam2_service

@router.post("/segment/auto")
async def auto_segment_image(
    file: UploadFile = File(...),
    points_per_side: int = Form(32),
    pred_iou_thresh: float = Form(0.88),
    stability_score_thresh: float = Form(0.95),
    ):
    """Automatically segment an image - finding all objects in the image.

    Args:
        file (UploadFile, optional): The image file to segment. Defaults to File(...).
        points_per_side (int, optional): Number of points per side for the grid. Defaults to Form(32).
        pred_iou_thresh (float, optional): IoU threshold for predictions. Defaults to Form(0.88).
        stability_score_thresh (float, optional): Stability score threshold for predictions. Defaults to Form(0.95).
    """
    try:
        if file.content_type and not file.content_type.startswith("image/"):
            return {"error": "Invalid file type. Please upload an image."}

        image_bytes = await file.read()  
        service = get_sam2_service()
        result = service.auto_segment(
            image_bytes=image_bytes,
            points_per_side=points_per_side,
            pred_iou_thresh=pred_iou_thresh,
            stability_score_thresh=stability_score_thresh
        )
        return JSONResponse(
            content=result,
            status_code=200
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Auto-segmentation failed: {str(e)}")