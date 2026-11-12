import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_DIR = os.path.join(PROJECT_ROOT, "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

DOCX_PATH = os.path.join(DOWNLOADS_DIR, "EduPulse_AI_Project_Documentation.docx")
PDF_PATH = os.path.join(DOWNLOADS_DIR, "EduPulse_AI_Project_Documentation.pdf")
MD_SOURCE = os.path.join(PROJECT_ROOT, "PROJECT_DOCUMENTATION.md")

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def generate_docx():
    doc = Document()
    
    # Page Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title.add_run("EduPulse.ai – Academic Feedback NLP & Sentiment Intelligence Platform")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(7, 27, 23)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = subtitle.add_run("Complete Technical Documentation: What We Used, Why We Used It, and Real-World Institutional Use")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(16, 185, 129)

    doc.add_paragraph() # Spacer

    with open(MD_SOURCE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_code_block = False
    code_lines = []

    for line in lines:
        raw = line.rstrip()
        
        # Skip top markdown title as we already added a styled one
        if raw.startswith("# EduPulse.ai") or raw.startswith("## Complete Technical"):
            continue

        if raw.startswith("```"):
            if in_code_block:
                in_code_block = False
                p = doc.add_paragraph()
                p_run = p.add_run("\n".join(code_lines))
                p_run.font.name = "Courier New"
                p_run.font.size = Pt(8.5)
                p_run.font.color.rgb = RGBColor(50, 50, 50)
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(raw)
            continue

        if raw.startswith("## "):
            h = doc.add_heading(level=1)
            r = h.add_run(raw[3:])
            r.font.name = "Arial"
            r.font.size = Pt(15)
            r.font.bold = True
            r.font.color.rgb = RGBColor(11, 41, 34)
        elif raw.startswith("### "):
            h = doc.add_heading(level=2)
            r = h.add_run(raw[4:])
            r.font.name = "Arial"
            r.font.size = Pt(12.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(16, 185, 129)
        elif raw.startswith("#### "):
            h = doc.add_heading(level=3)
            r = h.add_run(raw[5:])
            r.font.name = "Arial"
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = RGBColor(40, 40, 40)
        elif raw.startswith("* ") or raw.startswith("- "):
            p = doc.add_paragraph(style='List Bullet')
            text = raw[2:]
            parts = text.split("**")
            for i, part in enumerate(parts):
                run = p.add_run(part)
                run.font.name = "Calibri"
                run.font.size = Pt(10.5)
                if i % 2 == 1:
                    run.font.bold = True
        elif raw.startswith("> "):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.4)
            run = p.add_run(raw[2:])
            run.font.name = "Calibri"
            run.font.size = Pt(10.5)
            run.font.italic = True
            run.font.color.rgb = RGBColor(80, 80, 80)
        elif raw.startswith("|"):
            # Table lines handled cleanly or as plain text
            continue
        elif raw.strip() == "---":
            doc.add_paragraph()
        elif raw.strip():
            p = doc.add_paragraph()
            parts = raw.split("**")
            for i, part in enumerate(parts):
                run = p.add_run(part)
                run.font.name = "Calibri"
                run.font.size = Pt(11)
                if i % 2 == 1:
                    run.font.bold = True

    doc.save(DOCX_PATH)
    print(f"Created DOCX: {DOCX_PATH}")

def generate_pdf():
    doc = SimpleDocTemplate(PDF_PATH, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#071B17'),
        alignment=1,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#10B981'),
        alignment=1,
        spaceAfter=15
    )
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0B2922'),
        spaceBefore=12,
        spaceAfter=6
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#10B981'),
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=5
    )
    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f8fafc'),
        spaceBefore=5,
        spaceAfter=8
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        leftIndent=15,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=3
    )

    story = [
        Paragraph("EduPulse.ai – Academic Feedback NLP & Sentiment Intelligence Platform", title_style),
        Paragraph("Complete Technical Documentation: What We Used, Why We Used It, and Real-World Institutional Use", subtitle_style),
        Spacer(1, 10)
    ]

    with open(MD_SOURCE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_code = False
    code_buf = []

    for line in lines:
        raw = line.rstrip()
        if raw.startswith("# EduPulse.ai") or raw.startswith("## Complete Technical"):
            continue

        if raw.startswith("```"):
            if in_code:
                in_code = False
                story.append(Preformatted("\n".join(code_buf), code_style))
                code_buf = []
            else:
                in_code = True
                code_buf = []
            continue

        if in_code:
            code_buf.append(raw)
            continue

        if raw.startswith("## "):
            story.append(Paragraph(raw[3:], h1_style))
        elif raw.startswith("### "):
            story.append(Paragraph(raw[4:], h2_style))
        elif raw.startswith("#### "):
            story.append(Paragraph(f"<b>{raw[5:]}</b>", h2_style))
        elif raw.startswith("* ") or raw.startswith("- "):
            text = raw[2:].replace("**", "<b>", 1).replace("**", "</b>", 1)
            story.append(Paragraph(f"&bull; {text}", bullet_style))
        elif raw.startswith("> "):
            story.append(Paragraph(f"<i>{raw[2:]}</i>", bullet_style))
        elif raw.startswith("|"):
            continue
        elif raw.strip() == "---":
            story.append(Spacer(1, 8))
        elif raw.strip():
            text = raw.replace("**", "<b>", 1).replace("**", "</b>", 1)
            story.append(Paragraph(text, body_style))

    doc.build(story)
    print(f"Created PDF: {PDF_PATH}")

if __name__ == "__main__":
    generate_docx()
    generate_pdf()
