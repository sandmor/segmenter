import traceback
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..services.sam2 import SAM2Service
from ..services.vitmatte import ViTMatteService

router = APIRouter()

sam2_service = None
vitmatte_service = None

def get_sam2_service():
  global sam2_service
  if sam2_service is None:
      sam2_service = SAM2Service()
  return sam2_service

def get_vitmatte_service():
  global vitmatte_service
  if vitmatte_service is None:
      vitmatte_service = ViTMatteService()
  return vitmatte_service

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

@router.post("/segment/vitmatte")
async def vitmatte_segment_image(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    erosion_kernel_size: int = Form(10),
    dilation_kernel_size: int = Form(10),
    max_size: int = Form(1024),
    ):
    """Generate an alpha matte for an image using a mask.

    Args:
        image (UploadFile): The image file to segment.
        mask (UploadFile): The mask file to use for matting.
        erosion_kernel_size (int, optional): Erosion kernel size. Defaults to 10.
        dilation_kernel_size (int, optional): Dilation kernel size. Defaults to 10.
        max_size (int, optional): Maximum image size. Defaults to 1024.
    """
    try:
        if image.content_type and not image.content_type.startswith("image/"):
            return {"error": "Invalid image file type. Please upload an image."}
        if mask.content_type and not mask.content_type.startswith("image/"):
            return {"error": "Invalid mask file type. Please upload an image."}

        image_bytes = await image.read()
        mask_bytes = await mask.read()
        
        service = get_vitmatte_service()
        result = service.generate_matte(
            image_bytes=image_bytes,
            mask_bytes=mask_bytes,
            #erosion_kernel_size=erosion_kernel_size,
            #dilation_kernel_size=dilation_kernel_size,
            max_size=max_size
        )
        return JSONResponse(
            content=result,
            status_code=200
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ViTMatte segmentation failed: {str(e)}")
