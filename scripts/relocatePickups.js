const fs = require("fs");
const path = require("path");
const {
  Types: { ObjectId },
} = require("mongoose");
const { getPngDir } = require("../repositories/pickup");

const TARGET_PNG_ROOT_DIR = "E:\\pickup";

async function relocatePickups() {
  try {
    if (!fs.existsSync(TARGET_PNG_ROOT_DIR)) return;

    const files = fs.readdirSync(TARGET_PNG_ROOT_DIR);

    for (const file of files) {
      const filePath = path.join(TARGET_PNG_ROOT_DIR, file);

      if (!fs.statSync(filePath).isFile()) continue;

      const id = path.parse(file).name;

      if (!ObjectId.isValid(id)) continue;

      const objectId = new ObjectId(id);
      const dir = getPngDir(objectId.getTimestamp());

      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.renameSync(filePath, path.join(dir, file));
    }
  } catch (error) {
    console.error(error);
  }
}

relocatePickups();
