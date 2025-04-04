import fs from 'fs'
import archiver from 'archiver'

function Curseforge(mcv,modloader,mlver,mpver,sf,pathx,mpname,mpdes) {
    //初始化ZIP
    const zipfile = fs.createWriteStream(
        `${mpname}-${mpver}[${mcv}-${modloader}].zip`
    );
    const archive = archiver("zip", {
        zlib: { level: 0 },
    });
}
