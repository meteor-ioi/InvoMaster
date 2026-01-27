from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Literal

@dataclass
class BBox:
    """Standard bounding box (x0, y0, x1, y1)"""
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        return self.y1 - self.y0

    @property
    def area(self) -> float:
        return self.width * self.height
    
    @property
    def center(self) -> Tuple[float, float]:
        return ((self.x0 + self.x1) / 2, (self.y0 + self.y1) / 2)

    def to_list(self) -> List[float]:
        return [self.x0, self.y0, self.x1, self.y1]

@dataclass
class TextSpan:
    """Atomic unit of text with position (e.g., a character or word)"""
    text: str
    bbox: BBox
    font_name: Optional[str] = None
    font_size: float = 0.0

@dataclass
class TextLine:
    """A line of text composed of multiple spans"""
    spans: List[TextSpan] = field(default_factory=list)
    bbox: Optional[BBox] = None
    text: str = ""

    def update_bbox(self):
        if not self.spans:
            return
        x0 = min(s.bbox.x0 for s in self.spans)
        y0 = min(s.bbox.y0 for s in self.spans)
        x1 = max(s.bbox.x1 for s in self.spans)
        y1 = max(s.bbox.y1 for s in self.spans)
        self.bbox = BBox(x0, y0, x1, y1)
        self.text = "".join(s.text for s in self.spans)

@dataclass
class TextBlock:
    """A block/paragraph of text composed of multiple lines"""
    lines: List[TextLine] = field(default_factory=list)
    bbox: Optional[BBox] = None
    type: Literal["text", "title", "table", "header", "footer"] = "text"

@dataclass
class PageLayout:
    """Represents the analysis result for a single page"""
    page_number: int
    width: float
    height: float
    blocks: List[TextBlock] = field(default_factory=list)
    tables: List['TableRegion'] = field(default_factory=list)

@dataclass
class TableRegion:
    """Represents a detected table"""
    bbox: BBox
    rows: int
    cols: int
    # Cells can be added later
