"""Create the illustrated CSMIS workflow guide as a print-ready PDF."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Table, TableStyle,
    PageBreak, Spacer, KeepTogether,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "CSMIS_Workflow_Manual.pdf"
NAVY = colors.HexColor("#081f33")
ORANGE = colors.HexColor("#eb6a15")
PALE = colors.HexColor("#eaf2f8")
MUTED = colors.HexColor("#4f6377")


def footer(canvas, document):
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(42, 33, "CSMIS  |  Workflow guide  |  November 2026")
    canvas.drawRightString(570, 33, str(document.page))
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ManualTitle", fontName="Helvetica-Bold", fontSize=21,
                          leading=25, textColor=NAVY, spaceAfter=13))
styles.add(ParagraphStyle(name="ManualH1", fontName="Helvetica-Bold", fontSize=14,
                          leading=17, textColor=NAVY, spaceBefore=13, spaceAfter=7))
styles.add(ParagraphStyle(name="ManualH2", fontName="Helvetica-Bold", fontSize=10.5,
                          leading=14, textColor=NAVY, spaceBefore=9, spaceAfter=5))
styles.add(ParagraphStyle(name="ManualBody", fontName="Helvetica", fontSize=9.2,
                          leading=13.4, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name="ManualSmall", fontName="Helvetica", fontSize=8.5,
                          leading=12, textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle(name="ManualBox", fontName="Helvetica-Bold", fontSize=9,
                          leading=12, textColor=NAVY, alignment=TA_CENTER))


def para(text, style="ManualBody"):
    return Paragraph(text, styles[style])


def step(number, title, description):
    return KeepTogether([para(f"<b>{number}. {title}</b>  {description}")])


def note(label, text):
    table = Table([[para(f"<b>{label}</b>  {text}", "ManualSmall")]], colWidths=[510])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7d7e4")),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return [table, Spacer(1, 8)]


def flow(labels):
    content = []
    for index, label in enumerate(labels):
        content.append(para(label, "ManualBox"))
        if index != len(labels) - 1:
            content.append(para("&gt;", "ManualBox"))
    widths = []
    for index in range(len(content)):
        widths.append(88 if index % 2 == 0 else 17.5)
    table = Table([content], colWidths=widths, rowHeights=63)
    styling = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
    ]
    for index in range(0, len(content), 2):
        styling.append(("BACKGROUND", (index, 0), (index, 0), PALE))
        styling.append(("BOX", (index, 0), (index, 0), 0.5, colors.HexColor("#b9cfdd")))
    table.setStyle(TableStyle(styling))
    return table


story = []
story += [para("CSMIS Workflow Manual", "ManualTitle"),
          para("A step-by-step guide for a new sports meet, role handoffs, and published results. "
               "Use synthetic presentation data until official college rules and point values are approved."),
          Spacer(1, 10),
          flow(["Prepare", "Register", "Review", "Compete", "Publish"]),
          para("Each arrow is a controlled handoff. The next stage does not happen automatically.", "ManualSmall"),
          para("Recover from an accidentally closed meet", "ManualH1")]
story += [
    step(1, "Check the status", "In Sports meets, inspect the meet in the administrator or coordinator workspace. Closed and archived meets retain their audit history."),
    step(2, "Keep linked history", "Do not delete a meet that has events, rosters, results, or scoring records. An archived meet cannot accept new events through the ordinary workflow."),
    step(3, "Create a new draft", "Use a distinct name for the same year. The year must match the meet start date, and registration must close before the meet begins."),
]
story += note("Example", "For a meet on 20-21 November 2026, use a new name such as November Sports Meet Practice and close registration by 19 November.")
story += note("Exceptional reversal", "If a live meet must be reopened, first review all roster, attendance, result, scoring, and audit records. This requires an authorized audited recovery, not a direct SQL status edit.")

story += [PageBreak(), para("1  Prepare the meet", "ManualTitle")]
story += [
    step(1, "Provision staff", "System administrator: Users and roles. Create accounts, select roles, and set house or event scope where applicable. Confirm accounts are active."),
    step(2, "Verify students", "Registration officer or administrator: Students and Student imports. Confirm official identity, academic status, house, and a separate competition eligibility decision. Importing alone never makes a student eligible."),
    step(3, "Create the draft", "Sports meets: choose a new name, matching year, meet start/end dates, and a registration window that closes before the first meet day."),
    step(4, "Add houses and categories", "Open Configure houses and events. Mark participating houses and create the sport category before creating its events."),
    step(5, "Create events", "Choose individual or team, code, format, participant limit, team size where relevant, and event times inside the meet dates. Configure rules and requirements."),
    step(6, "Prepare scoring", "Scoring policy: enter officially approved placement values in a draft rule version. A different authorized manager approves it. Assign the approved version to the event."),
]
story += note("Check before opening", "A meet needs at least one participating house and one complete event. Core event configuration becomes locked once registration opens. Use a distinct meet name within 2026.")
story += [para("2  Register athletes", "ManualH1")]
story += [
    step(7, "Open the meet", "On Sports meets, advance draft to registration open."),
    step(8, "Open each event", "In the meet configuration, open registration for each event. Meet registration does not open event registration automatically."),
    step(9, "Create house entries", "House representative: Athlete registration. Select eligible own-house students, create teams for team events, check limits and schedule conflicts, then Submit roster for review."),
]
story += note("If the page says closed", "Check the meet status, event registration status, current registration time window, and whether the roster has been locked.")

story += [PageBreak(), para("3  Review and check in", "ManualTitle")]
story += [
    step(10, "Review the submission", "Registration officer, coordinator, or administrator: Roster review. Inspect Submitted house rosters, including the athlete list, then approve or reject with a reason. The submitter cannot approve their own roster."),
    step(11, "Close and lock", "After the deadline, close meet registration and lock each event roster. Late changes require a documented request and independent decision."),
    step(12, "Assign officials", "In Roster review, assign a check-in officer and event judge to each event. The user needs both the role and the event assignment."),
    step(13, "Give the athlete a pass", "The house representative opens the approved registration, selects Issue / rotate QR pass, downloads it, and hands it to the athlete after confirming identity. The system does not send passes automatically."),
    step(14, "Open event check-in", "A meet manager opens check-in after meet registration closes and the roster is locked. The assigned officer scans the pass and physically confirms identity. A manual fallback needs a reason."),
]
story += note("QR control", "A QR token does not itself approve participation. The system checks the event, approved entry, and duplicate attendance; the officer confirms physical identity.")
story += [para("4  Judge and verify results", "ManualH1")]
story += [
    step(15, "Start competition", "Move the meet and event to in progress using their lifecycle controls. A scheduled assigned event may appear in Result entry but cannot yet accept results."),
    step(16, "Judge submits", "The assigned judge records the checked-in athlete or approved team, outcome, placement, and measured performance as applicable. Save draft, then Submit for verification."),
    step(17, "Verifier reviews", "A different results verifier checks the submitted values and verifies or rejects with a reason. The judge cannot verify their own result."),
]

story += [PageBreak(), para("5  Approve and publish", "ManualTitle"),
          flow(["Judge submits", "Verifier checks", "Manager approves", "Rule awards", "Public sees"]),
          Spacer(1, 9)]
story += [
    step(18, "Approve", "The sports coordinator or administrator approves or finalizes the independently verified result. Public release needs a separate Publish publicly decision."),
    step(19, "Generate points", "Use Generate points with a reason. An approved, activated scoring version must be assigned to the event. Awards reference the approved result revision and rule version; duplicates are blocked."),
    step(20, "Declare standings", "Review published results and current awards, then record an authorized standings declaration. A disputed result prevents a final declaration."),
    step(21, "Handle protests", "A house representative files within the configured deadline using an approved ground. A manager assigns an independent, conflict-free protest committee reviewer, who records findings and a decision."),
    step(22, "Correct if upheld", "An upheld case keeps the result disputed until an authorized correction is reviewed. Recalculate awards and deliberately republish the corrected result."),
    step(23, "View publicly", "Public viewers use Scoreboard, Results, and Standings. They see only published results and current awards, never private student records or staff controls."),
]
story += [para("Who does what", "ManualH1")]
roles = [
    ("System administrator", "Accounts, houses, meet oversight, approval, audit"),
    ("Sports coordinator", "Meets, events, rosters, scoring, publication"),
    ("Registration officer", "Student register, eligibility, roster review"),
    ("House representative", "Own-house entries, roster, passes, protests"),
    ("Check-in officer", "Assigned-event identity and attendance"),
    ("Event judge", "Assigned-event results"),
    ("Results verifier", "Independent result review"),
    ("Protest committee", "Assigned conflict-free case decisions"),
    ("Public viewer", "Published scoreboard and standings"),
]
table = Table([[para("<b>Role</b>", "ManualSmall"), para("<b>Main responsibility</b>", "ManualSmall")]] +
              [[para(role, "ManualSmall"), para(task, "ManualSmall")] for role, task in roles],
              colWidths=[166, 344])
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PALE),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f8fa")]),
    ("LINEBELOW", (0, 0), (-1, 0), 0.5, NAVY),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
]))
story.append(table)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
document = BaseDocTemplate(str(OUTPUT), pagesize=(612, 792),
                           leftMargin=42, rightMargin=42, topMargin=45, bottomMargin=46)
frame = Frame(42, 46, 528, 701, leftPadding=4, rightPadding=4,
              topPadding=4, bottomPadding=4)
document.addPageTemplates(PageTemplate(id="manual", frames=[frame], onPage=footer))
document.build(story)
print(OUTPUT)
