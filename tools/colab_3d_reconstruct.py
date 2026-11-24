"""
===============================================================================
RECEITA GOOGLE COLAB (GPU T4 GRATUITA) — Fotos do Celular -> Modelo 3D (.glb)
Usando projetos Open-Source de ponta no GitHub:
  - VGGT (Meta / Visual Geometry Grounded Transformer): https://github.com/facebookresearch/vggt
  - Alternativa: MASt3R (Naver Vision): https://github.com/naver/mast3r

Por que usar este roteiro?
  O notebook local possui Intel HD Graphics 530 (sem NVIDIA CUDA).
  No Google Colab gratuito (Runtime -> Change runtime type -> T4 GPU),
  você transforma 15 a 40 fotos do muro/quintal da Casa Maracaju 88
  em um arquivo .glb pronto para importar no app Maracaju 3D em menos de 3 minutos!

Como usar:
  1. Compacte suas fotos (ex.: capturas/muro/*.jpg) em um arquivo fotos_maracaju.zip
  2. Abra https://colab.research.google.com/ -> Novo Notebook -> Runtime -> T4 GPU
  3. Cole os blocos abaixo em células do Colab e execute!
  4. Baixe o arquivo maracaju_scan.glb gerado e abra na Aba 1 do Maracaju 3D.
===============================================================================
"""

# ===== CÉLULA 1: Instalar VGGT (Open Source GitHub) =====
COLAB_CELL_1 = r"""
!git clone https://github.com/facebookresearch/vggt.git
%cd vggt
!pip install -q -r requirements.txt trimesh
"""

# ===== CÉLULA 2: Subir fotos_maracaju.zip do seu celular/notebook =====
COLAB_CELL_2 = r"""
from google.colab import files
import zipfile, os

uploaded = files.upload()  # Selecione fotos_maracaju.zip
os.makedirs("/content/fotos_casa", exist_ok=True)
for fname in uploaded.keys():
    with zipfile.ZipFile(fname, 'r') as zf:
        zf.extractall("/content/fotos_casa")

print("Fotos extraídas:", len(os.listdir("/content/fotos_casa")))
"""

# ===== CÉLULA 3: Reconstrução 3D e Exportação .GLB =====
COLAB_CELL_3 = r"""
import glob, torch, trimesh
import numpy as np
from vggt.models.vggt import VGGT
from vggt.utils.load_fn import load_and_preprocess_images
from vggt.utils.pose_enc import pose_encoding_to_extri_intri
from vggt.utils.geometry import unproject_depth_map_to_point_map

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.bfloat16 if torch.cuda.get_device_capability()[0] >= 8 else torch.float16

model = VGGT.from_pretrained("facebook/VGGT-1B").to(device)
model.eval()

img_paths = sorted(
    glob.glob("/content/fotos_casa/**/*.jpg", recursive=True) +
    glob.glob("/content/fotos_casa/**/*.jpeg", recursive=True) +
    glob.glob("/content/fotos_casa/**/*.png", recursive=True)
)[:30]  # Até 30 fotos por lote para caber folgado na GPU T4 (15GB VRAM)

images = load_and_preprocess_images(img_paths).to(device)
with torch.no_grad(), torch.cuda.amp.autocast(dtype=dtype):
    predictions = model(images)

extrinsic, intrinsic = pose_encoding_to_extri_intri(predictions["pose_enc"], images.shape[-2:])
depth_map = predictions["depth"].squeeze(0).cpu().numpy()
depth_conf = predictions["depth_conf"].squeeze(0).cpu().numpy()
world_points = unproject_depth_map_to_point_map(depth_map, extrinsic.squeeze(0).cpu().numpy(), intrinsic.squeeze(0).cpu().numpy())

# Filtra pontos de alta confiança e exporta nuvem colorida em GLB / PLY
colors = (images.permute(0, 2, 3, 1).cpu().numpy() * 255).astype(np.uint8)
mask = depth_conf.squeeze(-1) > np.percentile(depth_conf, 35)
pts = world_points[mask]
cols = colors[mask]

# Subamostragem leve para rodar ultra-rápido na Intel HD 530 e no celular
if len(pts) > 250_000:
    idx = np.random.choice(len(pts), 250_000, replace=False)
    pts, cols = pts[idx], cols[idx]

pc = trimesh.points.PointCloud(vertices=pts, colors=cols)
pc.export("/content/maracaju_scan.ply")
print("Salvo /content/maracaju_scan.ply com", len(pts), "pontos! (Importe direto no Maracaju 3D!)")

from google.colab import files
files.download("/content/maracaju_scan.ply")
"""

if __name__ == "__main__":
    print(__doc__)
    print("--- CÉLULA 1 ---\n", COLAB_CELL_1)
    print("--- CÉLULA 2 ---\n", COLAB_CELL_2)
    print("--- CÉLULA 3 ---\n", COLAB_CELL_3)
