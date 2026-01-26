from reportlab.pdfgen import canvas

def create_dummy_pdf(filename):
    c = canvas.Canvas(filename)
    c.drawString(100, 750, "Hello World. This is a unique document.")
    c.drawString(100, 730, "Random ID: 982374928374")
    c.save()

if __name__ == "__main__":
    create_dummy_pdf("dummy_test.pdf")
    print("Created dummy_test.pdf")
