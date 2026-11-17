import os
import glob
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontSize=16,
    leading=20,
    textColor=colors.HexColor('#1E293B'),
    spaceAfter=6,
)

subtitle_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#64748B'),
    spaceAfter=12,
)

heading_style = ParagraphStyle(
    'SectionHeading',
    parent=styles['Heading2'],
    fontSize=12,
    leading=16,
    textColor=colors.HexColor('#2563EB'),
    spaceBefore=10,
    spaceAfter=4,
)

body_style = ParagraphStyle(
    'BodyText',
    parent=styles['Normal'],
    fontSize=9.5,
    leading=13.5,
    textColor=colors.HexColor('#334155'),
    spaceAfter=3,
)

bullet_style = ParagraphStyle(
    'BulletText',
    parent=styles['Normal'],
    fontSize=9,
    leading=13,
    textColor=colors.HexColor('#334155'),
    leftIndent=14,
    spaceAfter=2,
)

txt_dir = r"d:\Referal Based\work-nucleus-ai\work-nucleus\test-samples"
files = glob.glob(os.path.join(txt_dir, "*.txt"))

for fpath in files:
    with open(fpath, "r", encoding="utf-8") as f:
        text = f.read()

    pdf_path = fpath.replace(".txt", ".pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    lines = text.strip().split("\n")
    
    # First line as title
    if lines:
        story.append(Paragraph(lines[0], title_style))
    
    for line in lines[1:]:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
            continue
        
        # Check if it's a section heading (ALL CAPS or known keywords)
        if line.isupper() and len(line) < 40:
            story.append(Paragraph(line, heading_style))
        elif line.startswith("- ") or line.startswith("• "):
            cleaned = line.lstrip("- •").strip()
            story.append(Paragraph(f"• {cleaned}", bullet_style))
        elif line.startswith("Email:") or line.startswith("Location:") or line.startswith("Company:"):
            story.append(Paragraph(line, subtitle_style))
        else:
            story.append(Paragraph(line, body_style))

    doc.build(story)
    print(f"Generated PDF: {pdf_path}")

print("All PDFs successfully generated!")
