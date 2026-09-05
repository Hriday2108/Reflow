import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_europe_itinerary_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor('#023e8a')  # ITA Airways Blue
    secondary_color = colors.HexColor('#e63946') # Red accent
    dark_text = colors.HexColor('#0F172A')
    muted_text = colors.HexColor('#475569')
    light_bg = colors.HexColor('#F8FAFC')
    card_border = colors.HexColor('#CBD5E1')
    
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=muted_text
    )
    
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=primary_color
    )
    
    cell_label = ParagraphStyle(
        'CellLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=muted_text
    )
    
    cell_val = ParagraphStyle(
        'CellVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=dark_text
    )

    cell_body = ParagraphStyle(
        'CellBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=dark_text
    )

    story = []
    
    # Header Table
    header_data = [
        [
            Paragraph('<b>ITA AIRWAYS</b> &bull; European Trip Itinerary', title_style),
            Paragraph('<b>E-TICKET CONFIRMATION</b><br/><b>PNR:</b> <font color="#023e8a"><b>AZ-78921</b></font><br/><b>E-Ticket:</b> 055-9182374620', subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width='100%', thickness=2, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    # Passenger & Trip Meta Table
    pax_data = [
        [
            Paragraph('<b>PASSENGER NAME</b>', cell_label),
            Paragraph('<b>TRAVEL ROUTE</b>', cell_label),
            Paragraph('<b>DATE OF ISSUE</b>', cell_label),
            Paragraph('<b>STATUS</b>', cell_label),
        ],
        [
            Paragraph('MR ALEX MORGAN', cell_val),
            Paragraph('ROME &rarr; NAPLES &rarr; POSITANO', cell_val),
            Paragraph('10 MAY 2025', cell_body),
            Paragraph('<font color="#059669"><b>CONFIRMED</b></font>', cell_val),
        ]
    ]
    pax_table = Table(pax_data, colWidths=[1.8*inch, 2.6*inch, 1.3*inch, 1.3*inch])
    pax_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, card_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(pax_table)
    story.append(Spacer(1, 12))
    
    # Section 1: Flight Segment
    story.append(Paragraph('SEGMENT 1: FLIGHT BOOKING (ITA AIRWAYS)', h2_style))
    story.append(Spacer(1, 4))
    
    flight_data = [
        [
            Paragraph('<b>Flight</b>', cell_label),
            Paragraph('<b>Departure</b>', cell_label),
            Paragraph('<b>Arrival</b>', cell_label),
            Paragraph('<b>Class / Seat</b>', cell_label),
            Paragraph('<b>Baggage</b>', cell_label),
        ],
        [
            Paragraph('<b>AZ 110</b><br/><font size="7" color="#64748B">Airbus A320</font>', cell_val),
            Paragraph('<b>FCO</b> Rome Fiumicino<br/>12 May 2025, 08:00 CET', cell_body),
            Paragraph('<b>NAP</b> Naples Capodichino<br/>12 May 2025, 09:15 CET', cell_body),
            Paragraph('Economy<br/>Seat <b>22C</b>', cell_body),
            Paragraph('23 Kg Check-in<br/>8 Kg Cabin', cell_body),
        ]
    ]
    flight_table = Table(flight_data, colWidths=[1.3*inch, 1.9*inch, 1.9*inch, 1.0*inch, 0.9*inch])
    flight_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e0f2fe')),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#7dd3fc')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bae6fd')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(flight_table)
    story.append(Spacer(1, 12))

    # Section 2: Connecting Train Segment
    story.append(Paragraph('SEGMENT 2: CONNECTING RAIL (TRENITALIA)', h2_style))
    story.append(Spacer(1, 4))
    
    train_data = [
        [
            Paragraph('<b>Train No. & Name</b>', cell_label),
            Paragraph('<b>Origin Station</b>', cell_label),
            Paragraph('<b>Destination Station</b>', cell_label),
            Paragraph('<b>Coach & Berth</b>', cell_label),
            Paragraph('<b>PNR</b>', cell_label),
        ],
        [
            Paragraph('<b>FR 9615</b><br/><font size="7" color="#64748B">Frecciarossa 1000</font>', cell_val),
            Paragraph('<b>Roma Termini</b><br/>12 May 2025, 11:30 CET', cell_body),
            Paragraph('<b>Napoli Centrale</b><br/>12 May 2025, 12:43 CET', cell_body),
            Paragraph('Business Class<br/>Coach <b>3 - Seat 15A</b>', cell_body),
            Paragraph('<b>XY93K2</b>', cell_val),
        ]
    ]
    train_table = Table(train_data, colWidths=[1.5*inch, 1.8*inch, 1.8*inch, 1.1*inch, 0.8*inch])
    train_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#fce7f3')),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fbcfe8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f9a8d4')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(train_table)
    story.append(Spacer(1, 12))

    # Section 3: Hotel & Transfer
    story.append(Paragraph('SEGMENTS 3 & 4: HOTEL ACCOMMODATION & GROUND TRANSFER', h2_style))
    story.append(Spacer(1, 4))
    
    hotel_transfer_data = [
        [
            Paragraph('<b>Hotel Property</b>', cell_label),
            Paragraph('<b>Stay Duration</b>', cell_label),
            Paragraph('<b>Transfer Route</b>', cell_label),
            Paragraph('<b>Provider / Ref</b>', cell_label),
        ],
        [
            Paragraph('<b>Grand Hotel Vesuvio</b><br/><font size="7" color="#64748B">Naples Historic Center</font>', cell_val),
            Paragraph('Check-in: 12 May 2025<br/>Check-out: 15 May 2025 (3 Nights)', cell_body),
            Paragraph('Napoli Centrale &rarr; Positano<br/>Scheduled Pickup: 12 May 13:00', cell_body),
            Paragraph('Ref: <b>HTL-8821</b><br/>Cab: <b>TRF-3301</b>', cell_val),
        ]
    ]
    ht_table = Table(hotel_transfer_data, colWidths=[2.2*inch, 1.8*inch, 1.8*inch, 1.2*inch])
    ht_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F0FDF4')),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BBF7D0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#DCFCE7')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(ht_table)
    story.append(Spacer(1, 14))
    
    # Notice & Reflow Recovery Integration Notice
    notice_style = ParagraphStyle(
        'Notice',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=muted_text
    )
    
    notice_data = [
        [
            Paragraph('<b>REFLOW DISRUPTION RECOVERY SYSTEM &bull; MONITORED TRIP</b><br/>'
                      'This multi-modal itinerary is registered under Reflow AI Protection. In case of schedule disruptions, '
                      'flight delays on AZ 110, or Frecciarossa railway schedule changes, Reflow evaluates cross-modal ripple '
                      'impacts on your connecting transport, hotel check-in times, and transfers, providing automated recovery options.',
                      notice_style)
        ]
    ]
    notice_table = Table(notice_data, colWidths=[7.0*inch])
    notice_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF3C7')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FCD34D')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(notice_table)
    
    doc.build(story)
    print(f'Successfully generated: {output_path}')

if __name__ == '__main__':
    os.makedirs('public', exist_ok=True)
    create_europe_itinerary_pdf('public/ITA_Airways_Rome_Naples_Confirmed_Tickets.pdf')
    # Also create in root workspace for easy drag-and-drop
    create_europe_itinerary_pdf('../ITA_Airways_Rome_Naples_Confirmed_Tickets.pdf')
