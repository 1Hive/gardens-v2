import Mustache from "mustache";
import path from "path";
import fs from "fs";
import minimist from "minimist";
const TEMPLATE_FOLDER_PATH = "src/templates";
var argv = minimist(process.argv.slice(2));
const network = argv["_"][0] || argv["network"] || argv["n"];

function loadJson(path) {
  if (!path) {
    throw new Error("LoadJson->Path need be defined");
  }
  if (!fs.existsSync(path)) {
    throw new Error(`LoadJson->File in path not exist: (${path})`);
  }
  const content = fs.readFileSync(path).toString();
  return JSON.parse(content);
}

function loadFileString(path) {
  if (!path) {
    throw new Error("loadFileString->Path need be defined");
  }
  if (!fs.existsSync(path)) {
    throw new Error(`loadFileString->File in path not exist: (${path})`);
  }
  return fs.readFileSync(path, "utf-8");
}

function runMustache() {
  const template = fs.readFileSync(
    path.join(TEMPLATE_FOLDER_PATH, "subgraph.yaml"),
    "utf8",
  );
  const view = loadJson(`config/${network}.json`);
  view.dataSources.forEach((data) => {
    const subTemplateContent = loadFileString(
      `${TEMPLATE_FOLDER_PATH}/${data.customTemplate}.yaml`,
    );
    data.subTemplate = Mustache.render(subTemplateContent, {
      ...data,
      ...view,
    });
  });
  // @ts-ignore
  let result = Mustache.render(template, view);

  fs.writeFileSync(`subgraph.yaml`, result);
}

runMustache();
