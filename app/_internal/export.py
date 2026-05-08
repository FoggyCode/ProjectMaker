
import zipfile
import os , datetime
from pathlib import Path

def toZip(path , targetFolder):
    if not os.path.exists(path): return False

    source_dir = Path(path) 

    zip_name = os.path.basename(path) + ".zip"
    zip_name = os.path.join(targetFolder , zip_name)

    zip_file = None

    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in source_dir.rglob("*"):
            if file_path.is_file():
                zip_file.write(file_path, arcname=file_path.relative_to(source_dir))

    return zip_name
