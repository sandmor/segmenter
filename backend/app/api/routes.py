import traceback
from typing import Literal
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..services.sam2 import SAM2Service
from ..services.vitmatte import ViTMatteService
from ..services.classical_matting import ClassicalMattingService

router = APIRouter()

sam2_service = None
vitmatte_service = None
classical_matting_service = None

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

def get_classical_matting_service():
    global classical_matting_service
    if classical_matting_service is None:
        classical_matting_service = ClassicalMattingService()
    return classical_matting_service

@router.post("/segment/auto")
async def auto_segment_image(
    file: UploadFile = File(...),
    points_per_side: int = Form(32, ge=1, le=128),
    pred_iou_thresh: float = Form(0.88, ge=0.0, le=1.0),
    stability_score_thresh: float = Form(0.95, ge=0.0, le=1.0),
    ):
    """Automatically segment an image - finding all objects in the image.

    Args:
        file (UploadFile, optional): The image file to segment. Defaults to File(...).
        points_per_side (int): The number of points to sample along each side of the image.
        pred_iou_thresh (float): The prediction IoU threshold.
        stability_score_thresh (float): The stability score threshold.
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

@router.post("/segment/matte")
async def matte_segment_image(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    erosion_kernel_size: int = Form(10, ge=0, le=50),
    dilation_kernel_size: int = Form(10, ge=0, le=50),
    max_size: int = Form(1024, ge=128, le=4096),
    algorithm: Literal["cf", "vitmatte", "knn", "lbdm", "lkm"] = Form("cf"),
    ):
    """Generate an alpha matte for an image using a mask.

    Args:
        image (UploadFile): The image file to segment.
        mask (UploadFile): The mask file to use for matting.
        erosion_kernel_size (int): The erosion kernel size.
        dilation_kernel_size (int): The dilation kernel size.
        max_size (int): The maximum size of the image.
        algorithm (str): The matting algorithm to use.
    """
    try:
        if image.content_type and not image.content_type.startswith("image/"):
            return {"error": "Invalid image file type. Please upload an image."}
        if mask.content_type and not mask.content_type.startswith("image/"):
            return {"error": "Invalid mask file type. Please upload an image."}

        image_bytes = await image.read()
        mask_bytes = await mask.read()

        print("Algorithm:", algorithm)
        
        if algorithm == "vitmatte":
            service = get_vitmatte_service()
            result = service.generate_matte(
                image_bytes=image_bytes,
                mask_bytes=mask_bytes,
                erosion_kernel_size=erosion_kernel_size,
                dilation_kernel_size=dilation_kernel_size,
                max_size=max_size
            )
        else:
            service = get_classical_matting_service()
            result = service.generate_matte(
                image_bytes=image_bytes,
                mask_bytes=mask_bytes,
                erosion_kernel_size=erosion_kernel_size,
                dilation_kernel_size=dilation_kernel_size,
                max_size=max_size,
                algorithm=algorithm
            )

        return JSONResponse(
            content=result,
            status_code=200
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Matte segmentation failed: {str(e)}")