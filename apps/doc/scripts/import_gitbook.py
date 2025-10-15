#!/usr/bin/env python3
"""
Fetch the published Gardens GitBook content and convert it into
Nextra-compatible MDX files under apps/doc/pages.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict, OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

BASE_URL = "https://docs.gardens.fund/"
API_BASE = "https://api.gitbook.com/v1"
USER_AGENT = "Mozilla/5.0 (compatible; gardens-docs-import/1.0)"


@dataclass
class PageEntry:
    id: str
    title: str
    slug: str
    path: str
    type: str
    description: str
    children: List["PageEntry"]

    @property
    def has_children(self) -> bool:
        return bool(self.children)


class GitBookClient:
    def __init__(self) -> None:
        self.token, self.space_id = self._fetch_token_and_space()
        self.api_headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        }

    def _fetch_token_and_space(self) -> Tuple[str, str]:
        request = urllib.request.Request(BASE_URL, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request) as response:
            html = response.read().decode("utf-8")
        token_match = re.search(r"apiToken%3A([^%]+)%2C", html)
        if not token_match:
            raise RuntimeError("Unable to locate GitBook API token in site HTML")
        space_match = re.search(r"space%3A([A-Za-z0-9]+)", html)
        if not space_match:
            raise RuntimeError("Unable to locate GitBook space identifier in site HTML")
        token = urllib.parse.unquote(token_match.group(1))
        space_id = space_match.group(1)
        return token, space_id

    def _fetch_json(self, url: str) -> dict:
        request = urllib.request.Request(url, headers=self.api_headers)
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode("utf-8"))

    def fetch_content_tree(self) -> dict:
        return self._fetch_json(f"{API_BASE}/spaces/{self.space_id}/content")

    def fetch_page(self, page_id: str) -> dict:
        return self._fetch_json(
            f"{API_BASE}/spaces/{self.space_id}/content/page/{page_id}"
        )

    def download_file(self, url: str, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            return
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request) as response, destination.open("wb") as fh:
            fh.write(response.read())


class DocStructureBuilder:
    def __init__(self, tree: dict):
        self.tree = tree
        self.page_lookup: Dict[str, PageEntry] = {}
        self.group_lookup: Dict[str, PageEntry] = {}
        self.meta_map: Dict[Tuple[str, ...], List[Tuple[str, dict]]] = defaultdict(list)
        self.render_queue: List[PageEntry] = []
        self.file_map: Dict[str, dict] = {
            item["id"]: item for item in tree.get("files", [])
        }
        root_children = [self._convert_entry(entry) for entry in tree["pages"]]
        root = PageEntry("", "", "", "", "root", "", root_children)
        self._build(root, [])

    def _convert_entry(self, data: dict) -> PageEntry:
        return PageEntry(
            id=data["id"],
            title=data["title"],
            slug=data["slug"],
            path=data["path"],
            type=data["type"],
            description=data.get("description", ""),
            children=[self._convert_entry(child) for child in data.get("pages", [])],
        )

    def _build(self, node: PageEntry, parent_dirs: List[str]) -> None:
        for entry in node.children:
            if entry.type == "group":
                self.group_lookup[entry.id] = entry
                self.meta_map[tuple(parent_dirs)].append(
                    (entry.slug, {"title": entry.title})
                )
                self._build(entry, parent_dirs + [entry.slug])
            elif entry.type == "document":
                self.page_lookup[entry.id] = entry
                key = "index" if entry.path == "readme" and not parent_dirs else entry.slug
                self.meta_map[tuple(parent_dirs)].append((key, {"title": entry.title}))
                self.render_queue.append(entry)
                if entry.children:
                    child_dir = tuple(parent_dirs + [entry.slug])
                    if not any(k == "index" for k, _ in self.meta_map[child_dir]):
                        self.meta_map[child_dir].append(
                            ("index", {"title": entry.title})
                        )
                    self._build(entry, parent_dirs + [entry.slug])

    def iter_render_entries(self) -> Iterable[PageEntry]:
        yield from self.render_queue


class MarkdownRenderer:
    def __init__(
        self,
        builder: DocStructureBuilder,
        client: GitBookClient,
        doc_root: Path,
    ):
        self.builder = builder
        self.client = client
        self.doc_root = doc_root
        self.pages_dir = doc_root / "pages"
        self.assets_dir = doc_root / "public" / "media"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.file_cache: Dict[str, str] = {}
        self.page_path_map = self._compute_page_paths()
        self.group_first_doc: Dict[str, str] = self._compute_group_first_paths()

    def _compute_page_paths(self) -> Dict[str, str]:
        mapping = {}
        for page in self.builder.render_queue:
            if page.path == "readme":
                mapping[page.id] = "/"
            else:
                mapping[page.id] = f"/{page.path}"
        return mapping

    def _compute_group_first_paths(self) -> Dict[str, str]:
        result = {}
        for group_id, group_entry in self.builder.group_lookup.items():
            first = self._find_first_document(group_entry)
            if first:
                result[group_id] = "/" if first.path == "readme" else f"/{first.path}"
        return result

    def _find_first_document(self, entry: PageEntry) -> Optional[PageEntry]:
        for child in entry.children:
            if child.type == "document":
                return self.builder.page_lookup.get(child.id, child)
            if child.type == "group":
                nested = self._find_first_document(child)
                if nested:
                    return nested
        return None

    def render_all(self) -> None:
        for entry in self.builder.iter_render_entries():
            self._render_entry(entry)

    def _render_entry(self, entry: PageEntry) -> None:
        page_data = self.client.fetch_page(entry.id)
        target_path = self._output_path(entry)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        used_components: set = set()
        body = self._render_nodes(page_data["document"]["nodes"], entry, used_components)
        front_matter = [
            "---",
            f'title: "{entry.title}"',
        ]
        if entry.description:
            front_matter.append(f'description: "{entry.description}"')
        front_matter.append("---")
        front_matter.append("")
        imports = []
        if "Cards" in used_components:
            imports.append("import { Cards } from 'nextra/components'")
        content_lines = imports + ([""] if imports else []) + front_matter + [body.strip(), ""]
        target_path.write_text("\n".join(content_lines), encoding="utf-8")

    def _output_path(self, entry: PageEntry) -> Path:
        if entry.path == "readme":
            return self.pages_dir / "index.mdx"
        parts = entry.path.split("/")
        if entry.children:
            return self.pages_dir.joinpath(*parts) / "index.mdx"
        return self.pages_dir.joinpath(*parts[:-1], f"{parts[-1]}.mdx")

    def _render_nodes(
        self, nodes: List[dict], entry: PageEntry, used_components: set
    ) -> str:
        blocks = []
        for node in nodes:
            rendered = self._render_block(node, entry, used_components)
            if rendered:
                blocks.append(rendered.strip())
        return "\n\n".join(filter(None, blocks))

    def _render_block(
        self, node: dict, entry: PageEntry, used_components: set
    ) -> str:
        if node.get("object") != "block":
            return ""
        block_type = node.get("type")
        if block_type == "paragraph":
            return self._render_inline_container(node.get("nodes", []))
        if block_type and block_type.startswith("heading-"):
            level = int(block_type.split("-")[1])
            text = self._render_inline_container(node.get("nodes", []))
            if not text.strip():
                return ""
            return f"{'#' * level} {text}"
        if block_type == "list-unordered":
            return self._render_list(node, ordered=False, entry=entry, used_components=used_components)
        if block_type == "list-ordered":
            return self._render_list(node, ordered=True, entry=entry, used_components=used_components)
        if block_type == "hint":
            style = node.get("data", {}).get("style", "info")
            content = self._render_nodes(node.get("nodes", []), entry, used_components)
            tag = {
                "info": "info",
                "warning": "warning",
                "danger": "danger",
                "success": "success",
            }.get(style, "info")
            lines = [line for line in content.splitlines()]
            result = [f"> [!{tag}]"]
            result.extend(f"> {line}" if line else ">" for line in lines)
            return "\n".join(result)
        if block_type == "divider":
            return "---"
        if block_type == "blockquote":
            content = self._render_nodes(node.get("nodes", []), entry, used_components)
            return "\n".join(f"> {line}" if line else ">" for line in content.splitlines())
        if block_type == "embed":
            url = node.get("data", {}).get("url", "")
            caption = self._extract_caption(node)
            label = caption if caption else url
            return f"[{label}]({url})"
        if block_type == "image":
            return self._render_image(node, entry)
        if block_type == "images":
            parts = [
                self._render_image(child, entry)
                for child in node.get("nodes", [])
                if child.get("type") == "image"
            ]
            return "\n\n".join(filter(None, parts))
        if block_type == "table":
            rendered = self._render_table(node, entry, used_components)
            if rendered:
                used_components.add("Cards")
            return rendered
        if block_type == "content-ref":
            return self._render_content_ref(node)
        return ""

    def _render_list(self, node: dict, ordered: bool, entry: PageEntry, used_components: set) -> str:
        lines = []
        for idx, item in enumerate(node.get("nodes", []), start=1):
            marker = f"{idx}." if ordered else "-"
            item_blocks = []
            for child in item.get("nodes", []):
                rendered = self._render_block(child, entry, used_components)
                if rendered:
                    item_blocks.append(rendered)
            if not item_blocks:
                continue
            first, *rest = item_blocks
            bullet = f"{marker} {first}"
            if rest:
                for addition in rest:
                    for sub_line in addition.splitlines():
                        bullet += f"\n  {sub_line}"
            lines.append(bullet)
        return "\n".join(lines)

    def _render_inline_container(self, nodes: List[dict]) -> str:
        parts: List[str] = []
        for node in nodes:
            obj = node.get("object")
            if obj == "text":
                for leaf in node.get("leaves", []):
                    parts.append(self._apply_marks(self._escape_text(leaf.get("text", "")), leaf.get("marks", [])))
            elif obj == "inline":
                inline_type = node.get("type")
                if inline_type == "link":
                    ref = node.get("data", {}).get("ref", {})
                    url = ""
                    if ref.get("kind") == "url":
                        url = ref.get("url", "")
                    elif ref.get("kind") == "page":
                        target = ref.get("page")
                        url = self.page_path_map.get(target) or self.group_first_doc.get(target, "")
                    label = self._render_inline_container(node.get("nodes", []))
                    if url:
                        parts.append(f"[{label}]({url})")
                    else:
                        parts.append(label)
                else:
                    parts.append(self._render_inline_container(node.get("nodes", [])))
            elif obj == "fragment":
                parts.append(self._render_inline_container(node.get("nodes", [])))
        return "".join(parts)

    def _apply_marks(self, text: str, marks: List[dict]) -> str:
        for mark in marks or []:
            mark_type = mark.get("type")
            if mark_type == "bold":
                text = f"**{text}**"
            elif mark_type == "italic":
                text = f"*{text}*"
            elif mark_type == "code":
                text = f"`{text}`"
            elif mark_type == "underline":
                text = f"<u>{text}</u>"
            elif mark_type == "strikethrough":
                text = f"~~{text}~~"
        return text

    def _escape_text(self, text: str) -> str:
        escape_map = {
            "\\": "\\\\",
            "*": "\\*",
            "_": "\\_",
            "`": "\\`",
            "{": "\\{",
            "}": "\\}",
            "[": "\\[",
            "]": "\\]",
        }
        for char, replacement in escape_map.items():
            text = text.replace(char, replacement)
        return text

    def _render_image(self, node: dict, entry: PageEntry) -> str:
        ref = node.get("data", {}).get("ref", {})
        file_id = ref.get("file")
        if not file_id or file_id not in self.builder.file_map:
            return ""
        target_path = self._ensure_asset(file_id)
        caption = self._extract_caption(node, entry)
        alt = caption or ""
        return f"![{alt}]({target_path})"

    def _ensure_asset(self, file_id: str) -> str:
        if file_id in self.file_cache:
            return self.file_cache[file_id]
        info = self.builder.file_map[file_id]
        original_name = info.get("name") or f"{file_id}"
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", original_name)
        filename = f"{file_id}-{safe_name}"
        destination = self.assets_dir / filename
        self.client.download_file(info["downloadURL"], destination)
        web_path = f"/media/{filename}"
        self.file_cache[file_id] = web_path
        return web_path

    def _extract_caption(self, node: dict, entry: Optional[PageEntry] = None) -> str:
        fragments = node.get("fragments", [])
        for fragment in fragments:
            if fragment.get("fragment") == "caption":
                if entry is not None:
                    return self._render_nodes(fragment.get("nodes", []), entry, set()).replace("\n", " ").strip()
                return self._render_inline_container(fragment.get("nodes", []))
        return ""

    def _render_table(self, node: dict, entry: PageEntry, used_components: set) -> str:
        records = node.get("data", {}).get("records", {})
        definition = node.get("data", {}).get("definition", {})
        fragments = {}
        for frag in node.get("fragments", []):
            fragment_id = frag.get("fragment")
            fragment_text = self._render_nodes(frag.get("nodes", []), entry, set()).replace("\n", " ").strip()
            fragments[fragment_id] = fragment_text
        content_ref_key = None
        title_key = None
        description_key = None
        for key, value in definition.items():
            if value.get("type") == "content-ref":
                content_ref_key = key
            elif value.get("type") == "text":
                if not title_key:
                    title_key = key
                else:
                    description_key = description_key or key
        cards = []
        for record in sorted(records.values(), key=lambda item: item.get("orderIndex", "")):
            values = record.get("values", {})
            href = ""
            if content_ref_key:
                ref = values.get(content_ref_key, {})
                if isinstance(ref, dict) and ref.get("kind") == "page":
                    page_id = ref.get("page")
                    href = self.page_path_map.get(page_id) or self.group_first_doc.get(page_id, "")
            title = fragments.get(values.get(title_key)) if title_key else ""
            description = fragments.get(values.get(description_key)) if description_key else ""
            if href and title:
                description = description or ""
                body = description.strip()
                cards.append((title.strip(), href, body))
        if not cards:
            return ""
        lines = ["<Cards>"]
        for title, href, body in cards:
            if body:
                lines.append(f'  <Cards.Card title="{title}" href="{href}">{body}</Cards.Card>')
            else:
                lines.append(f'  <Cards.Card title="{title}" href="{href}" />')
        lines.append("</Cards>")
        return "\n".join(lines)

    def _render_content_ref(self, node: dict) -> str:
        ref = node.get("data", {}).get("ref", {})
        if ref.get("kind") != "page":
            return ""
        target = ref.get("page")
        href = self.page_path_map.get(target) or self.group_first_doc.get(target, "")
        if not href:
            return ""
        target_entry = self.builder.page_lookup.get(target) or self.builder.group_lookup.get(target)
        label = target_entry.title if target_entry else href
        return f"[{label}]({href})"


def write_meta_files(builder: DocStructureBuilder, pages_dir: Path) -> None:
    for parts, entries in builder.meta_map.items():
        meta_path = (
            pages_dir.joinpath(*parts, "_meta.json")
            if parts
            else pages_dir / "_meta.json"
        )
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        meta_dict = OrderedDict()
        for key, value in entries:
            if key in meta_dict:
                continue
            meta_dict[key] = value
        meta_path.write_text(json.dumps(meta_dict, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    doc_root = Path(__file__).resolve().parents[1]
    client = GitBookClient()
    tree = client.fetch_content_tree()
    builder = DocStructureBuilder(tree)
    renderer = MarkdownRenderer(builder, client, doc_root)
    renderer.render_all()
    write_meta_files(builder, renderer.pages_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
