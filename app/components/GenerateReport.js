"use client";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  
  // Convert to string and replace problematic characters
  const strValue = String(value);
  
  // Replace Greek characters and other special characters with appropriate alternatives
  return strValue
    .replace(/Φ/g, 'Ph') // Replace phi with 'Ph'
    .replace(/[^\x00-\x7F]/g, char => {
      // Replace any other non-ASCII characters with their closest ASCII equivalent or ''
      return '';
    });
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Update the formatUnit object
const formatUnit = {
  flowRate: "m³/hr", // Use plain text instead of Unicode
  temperature: "°C",  // Use plain text instead of Unicode
  pressure: "kPa",
  weight: "kg",
  length: "mm"
};

export async function generateReport(selectionData, performanceCurveImage) {
  try {
    // Fetch tower model details from cooling_tower_models table
    const { data: modelDetails, error } = await supabase
      .from('cooling_tower_models')
      .select('*')
      .eq('model_name', selectionData.cooling_tower_model)
      .single();

    if (error) {
      console.error('Error fetching model details:', error);
      throw new Error('Failed to fetch cooling tower model details');
    }

    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Update the color definitions
    const primaryColor = rgb(0.16, 0.17, 0.46); // #292C75 - Navy Blue
    const secondaryColor = rgb(0.75, 0.24, 0.16); // #BE3C2A - Red
    const textColor = rgb(0.1, 0.1, 0.1); // Near black
    const lightPrimaryColor = rgb(0.7, 0.7, 0.7); // Light version of primary for backgrounds

    // Function to add letterhead to a page
    const addLetterhead = async (page, isFirstPage = false) => {
      const { width, height } = page.getSize();
      
      try {
        // Try loading the logo from public directory
        const logoResponse = await fetch('/company-logo.jpg');
        const logoArrayBuffer = await logoResponse.arrayBuffer();
        
        // Try embedding as PNG first, if that fails try JPG
        let logoImage;
        try {
          logoImage = await pdfDoc.embedPng(new Uint8Array(logoArrayBuffer));
        } catch (pngError) {
          try {
            logoImage = await pdfDoc.embedJpg(new Uint8Array(logoArrayBuffer));
          } catch (jpgError) {
            console.error('Error loading logo as PNG or JPG:', pngError, jpgError);
            throw new Error('Invalid image format');
          }
        }

        // Draw the logo
        page.drawImage(logoImage, {
          x: 50,
          y: height - 80,
          width: 180,
          height: 60,
        });

        // Rest of letterhead remains the same...
// Replace the existing company name text drawing with:
// Draw "Thermal-" in primary color
page.drawText("THERMAL-", {
  x: width - 250,
  y: height - 30,
  size: 14,
  color: primaryColor,
  font: helveticaBold,
});

// Draw "CELL" in secondary color
page.drawText("CELL", {
  x: width - 176,
  y: height - 30,
  size: 14,
  color: secondaryColor,
  font: helveticaBold,
});

// Draw "SDN. BHD." in primary color
page.drawText("SDN. BHD.", {
  x: width - 137,
  y: height - 30,
  size: 14,
  color: primaryColor,
  font: helveticaBold,
});
        
        page.drawText("PT 10618, Jalan Permata 2, Arab Malaysia Industrial Park", {
          x: width - 250,
          y: height - 45,
          size: 8,
          color: textColor,
          font: helvetica,
        });
        
        page.drawText("71800, Nilai, Negeri Sembilan, Malaysia", {
          x: width - 250,
          y: height - 60,
          size: 8, 
          color: textColor,
          font: helvetica,
        });

        // Add contact information
        page.drawText("Tel: +6-06-799 6618 | +6-011-1218-9662", {
          x: width - 250,
          y: height - 75,
          size: 8,
          color: textColor,
          font: helvetica,
        });

        page.drawText("Email: inquiry@thermal-cell.com", {
          x: width - 250,
          y: height - 90,
          size: 8,
          color: textColor,
          font: helvetica,
        });
        
        // Add a divider line
        page.drawLine({
          start: { x: 50, y: height - 110 },
          end: { x: width - 50, y: height - 110 },
          thickness: 1,
          color: primaryColor,
        });

        // Only add title on the first page
        if (isFirstPage) {
          // Title with background
          page.drawRectangle({
            x: 50,
            y: height - 130,
            width: width - 100,
            height: 30,
            color: primaryColor,
          });
          
          page.drawText('COOLING TOWER SELECTION REPORT', {
            x: 55,
            y: height - 120,
            size: 18,
            color: rgb(1, 1, 1), // White
            font: helveticaBold,
          });
        }
      } catch (error) {
        console.error('Error adding letterhead:', error);
        // Fallback to a placeholder rectangle if image loading fails
        page.drawRectangle({
          x: 50,
          y: height - 80,
          width: 100,
          height: 60,
          color: secondaryColor,
        });

        page.drawText("COMPANY LOGO", {
          x: 55,
          y: height - 55,
          size: 10,
          color: primaryColor,
          font: helveticaBold,
        });
      }
    };

    // Function to add footer to a page
    const addFooter = (page, pageNumber, totalPages) => {
      const { width, height } = page.getSize();
      
      // Add page number
      page.drawText(`Page ${pageNumber} of ${totalPages}`, {
        x: width / 2 - 30,
        y: 30,
        size: 10,
        color: textColor,
        font: timesItalic,
      });
      
      // Add footer line
      page.drawLine({
        start: { x: 50, y: 40 },
        end: { x: width - 50, y: 40 },
        thickness: 1,
        color: primaryColor,
      });
      
      // Add footer text
      page.drawText('Confidential - For Project Use Only', {
        x: 50,
        y: 25,
        size: 7,
        color: textColor,
        font: timesItalic,
      });
      
      // Add date on the right
      page.drawText(formatDate(new Date()), {
        x: width - 100,
        y: 25,
        size: 7,
        color: textColor,
        font: timesItalic,
      });
    };

    // Create a styled section title function
    const addSectionTitle = (page, title, yPosition) => {
      const { width } = page.getSize();
      
      page.drawRectangle({
        x: 50,
        y: yPosition - 5,
        width: width - 100,
        height: 23,
        color: rgb(0.9, 0.9, 0.95), // Very light blue
        borderColor: primaryColor,
        borderWidth: 1,
      });
      
      page.drawText(title, {
        x: 60,
        y: yPosition + 3,
        size: 14,
        color: primaryColor,
        font: helveticaBold,
      });
      
      return yPosition - 30; // Return the new Y position
    };

    // Add a styled subsection title function
    const addSubsectionTitle = (page, title, yPosition) => {
      const { width } = page.getSize();
      
      page.drawText(title, {
        x: 50,
        y: yPosition,
        size: 12,
        color: primaryColor,
        font: helveticaBold,
      });
      
      page.drawLine({
        start: { x: 50, y: yPosition - 5 },
        end: { x: 200, y: yPosition - 5 },
        thickness: 1,
        color: primaryColor,
      });
      
      return yPosition - 25; // Return the new Y position
    };

    // Page 1
    const page1 = pdfDoc.addPage();
    const { width, height } = page1.getSize();
    
    // Add letterhead to the first page
    await addLetterhead(page1, true);
    
    const drawText = (text, x, y, size = 10, font = helvetica, color = textColor) => {
      if (text) {
        try {
          // Don't use formatValue for the entire string when it includes units
          if (typeof text === 'string' && text.includes('m³/hr') || text.includes('°C')) {
            page1.drawText(text, { x, y, size, font, color });
          } else {
            page1.drawText(formatValue(text), { x, y, size, font, color });
          }
        } catch (error) {
          console.error(`Error drawing text "${text}":`, error);
          // Try drawing a simplified version
          page1.drawText("[Error displaying text]", { x, y, size, font, color });
        }
      }
    };

    // Start content below the letterhead and title
    let yPosition = height - 155;

    // 1. Project Details
    yPosition = addSectionTitle(page1, '1. PROJECT DETAILS', yPosition);

    // Project Details in two columns with better styling
    // Create background rectangle for better visual separation
    page1.drawRectangle({
      x: 50,
      y: yPosition - 190,
      width: width - 100,
      height: 210,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    // Project Details in two columns
    drawText('Project Name:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.project_name), 170, yPosition);
    drawText('Selection By:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.selection_by), 420, yPosition);
    yPosition -= 45;

    drawText('Client Name:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.client_name), 170, yPosition);
    drawText('Date:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatDate(selectionData?.date_created), 420, yPosition);
    yPosition -= 45;

    drawText('Location:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.location), 170, yPosition);
    yPosition -= 45;

    drawText('Description:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.description), 170, yPosition);
    yPosition -= 45;

    // 2. Design Conditions
    yPosition = addSectionTitle(page1, '2. DESIGN CONDITIONS', yPosition-35);

    const hwt = parseFloat(selectionData?.hot_water_temp) || 0;
    const cwt = parseFloat(selectionData?.cold_water_temp) || 0;
    const wbt = parseFloat(selectionData?.wet_bulb_temp) || 0;

    // Design Conditions with background
    page1.drawRectangle({
      x: 50,
      y: yPosition - 165,
      width: width - 100,
      height: 185,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    // Design Conditions in two columns
    drawText('Water Flow Rate:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${selectionData?.water_flow_rate} m³/hr`, 190, yPosition);
    drawText('Atmospheric Pressure:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(selectionData?.atmospheric_pressure)} ${formatUnit.pressure}`, 450, yPosition);
    yPosition -= 45;

    drawText('Hot Water Temperature:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${hwt} °C`, 190, yPosition);
    drawText('Cold Water Temperature:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(cwt)} ${formatUnit.temperature}`, 450, yPosition);
    yPosition -= 45;

    drawText('Wet Bulb Temperature:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(wbt)} ${formatUnit.temperature}`, 190, yPosition);
    drawText('Dry Bulb Temperature:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(selectionData?.dry_bulb_temp)} ${formatUnit.temperature}`, 450, yPosition);
    yPosition -= 45;

    drawText('Range:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(hwt - cwt)} ${formatUnit.temperature}`, 190, yPosition);
    drawText('Approach:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(cwt - wbt)} ${formatUnit.temperature}`, 450, yPosition);
    yPosition -= 45;

    // 3. Selection Results
    yPosition = addSectionTitle(page1, '3. SELECTION RESULTS', yPosition-10);

    // Selection Results with background
    page1.drawRectangle({
      x: 50,
      y: yPosition - 145,
      width: width - 100,
      height: 165,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    // Selection Results in two columns
    drawText('Tower Model:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.cooling_tower_model), 190, yPosition);
    drawText('Motor Output/Cell:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(modelDetails?.motor_output)} kW`, 450, yPosition);
    yPosition -= 45;

    drawText('Nominal Capacity/Cell:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${modelDetails?.nominal_flowrate} m³/hr`, 190, yPosition);
    drawText('Number of Cells:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(formatValue(selectionData?.number_of_cells), 450, yPosition);
    yPosition -= 45;

    drawText('Actual Capacity:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(selectionData?.actual_capacity)} ${formatUnit.flowRate}`, 190, yPosition);
    drawText('Safety Factor:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawText(`${formatValue(selectionData?.safety_factor)}%`, 450, yPosition);
    
    // Add footer to the first page
    addFooter(page1, 1, 4);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Page 2 - Tower Specifications
    const page2 = pdfDoc.addPage();
    // Add letterhead to the second page (without the title)
    await addLetterhead(page2);
    
    yPosition = height - 150;

    const drawTextPage2 = (text, x, y, size = 10, font = helvetica, color = textColor) => {
      if (text) {
        try {
          if (typeof text === 'string' && (text.includes('m³/hr') || text.includes('°C') || text.includes('mm') || text.includes('kg'))) {
            page2.drawText(text, { x, y, size, font, color });
          } else {
            page2.drawText(formatValue(text), { x, y, size, font, color });
          }
        } catch (error) {
          console.error(`Error drawing text "${text}":`, error);
          // Try drawing a simplified version
          page2.drawText("[Error displaying text]", { x, y, size, font, color });
        }
      }
    };
    
    // 4. TOWER SPECIFICATIONS
    // yPosition -= 5; // Adjust for the title height

    yPosition = addSectionTitle(page2, '4. TOWER SPECIFICATIONS', yPosition+15);

    // Physical Dimensions with background
    page2.drawRectangle({
      x: 50,
      y: yPosition - 80,
      width: width - 100,
      height: 100,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    drawTextPage2('Cell Length:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawTextPage2(`${formatValue(modelDetails?.cell_length)} mm`, 190, yPosition);
    drawTextPage2('Cell Height:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawTextPage2(`${formatValue(modelDetails?.cell_height)} mm`, 450, yPosition);
    yPosition -= 33;

    drawTextPage2('Cell Width:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawTextPage2(`${formatValue(modelDetails?.cell_width)} mm`, 190, yPosition);
    drawTextPage2('Fan Stack Height:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawTextPage2(`${formatValue(modelDetails?.fan_stack_height)} mm`, 450, yPosition);
    yPosition -= 33;

    drawTextPage2('Dry Weight:', 60, yPosition, 10, helveticaBold, primaryColor);
    drawTextPage2(`${formatValue(modelDetails?.dry_weight)} kg`, 190, yPosition);
    drawTextPage2('Operating Weight:', 320, yPosition, 10, helveticaBold, primaryColor);
    drawTextPage2(`${formatValue(modelDetails?.operating_weight)} kg`, 450, yPosition);
    yPosition -= 33;
    yPosition -= 5;

    // Piping Details
    yPosition = addSectionTitle(page2, 'Piping Details', yPosition);

    // Piping details with background
    page2.drawRectangle({
      x: 50,
      y: yPosition - 185,
      width: width - 100,
      height: 205,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    const pipingDetails = [
      ['Inlet Pipe Diameter:', modelDetails?.inlet_pipe, 'Number of Inlet Pipes:', modelDetails?.inlet_pipe_qty],
      ['Outlet Pipe Diameter:', modelDetails?.outlet_pipe, 'Number of Outlet Pipes:', modelDetails?.outlet_pipe_qty],
      ['Drain Pipe Diameter:', modelDetails?.drain_overflow_pipe, 'Number of Drain Pipes:', modelDetails?.drain_overflow_pipe_qty],
      ['Overflow Pipe Diameter:', modelDetails?.drain_overflow_pipe, 'Number of Overflow Pipes:', modelDetails?.drain_overflow_pipe_qty],
      ['Auto Make-up Pipe Diameter:', modelDetails?.auto_manual_pipe, 'Number of Auto Make-up Pipes:', modelDetails?.auto_manual_pipe_qty],
      ['Manual Make-up Pipe Diameter:', modelDetails?.auto_manual_pipe, 'Number of Manual Make-up Pipes:', modelDetails?.auto_manual_pipe_qty]
    ];

    pipingDetails.forEach(([label1, value1, label2, value2]) => {
      drawTextPage2(label1, 60, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(`${formatValue(value1)} mm`, 250, yPosition);
      drawTextPage2(label2, 320, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value2), 510, yPosition);
      yPosition -= 33;
    });
    yPosition -= 10;
    // yPosition -= 5;


    // Motor Details
    yPosition = addSectionTitle(page2, 'Motor Details', yPosition);

    // Motor details with background
    page2.drawRectangle({
      x: 50,
      y: yPosition - 50,
      width: width - 100,
      height: 70,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    const motorDetails = [
      ['Motor Make:', modelDetails?.motor_make, 'Motor Type:', modelDetails?.motor_type],
      ['Motor Output/Cell:', `${modelDetails?.motor_output} kW`, 'Motor Power Supply:', modelDetails?.volt_phase_cycle]
    ];

    motorDetails.forEach(([label1, value1, label2, value2]) => {
      drawTextPage2(label1, 60, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value1), 170, yPosition);
      drawTextPage2(label2, 320, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value2), 450, yPosition);
      yPosition -= 33;
    });
    yPosition -= 10;
    // yPosition -= 5;


    // Fan Details
    yPosition = addSectionTitle(page2, 'Fan Details', yPosition);

    // Fan details with background
    page2.drawRectangle({
      x: 50,
      y: yPosition - 50,
      width: width - 100,
      height: 70,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    const fanDetails = [
      ['Fan Type:', modelDetails?.fan_type, 'Fan Blade Material:', modelDetails?.blade_material],
      ['Drive Type:', modelDetails?.drive_type, 'Fan Hub Material:', modelDetails?.hub_material]
    ];

    fanDetails.forEach(([label1, value1, label2, value2]) => {
      drawTextPage2(label1, 60, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value1), 170, yPosition);
      drawTextPage2(label2, 320, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value2), 450, yPosition);
      yPosition -= 33;
    });
    yPosition -= 5;

    // Materials of Construction
    yPosition = addSectionTitle(page2, 'Materials of Construction', yPosition);

    // Materials with background
    page2.drawRectangle({
      x: 50,
      y: yPosition - 55,
      width: width - 100,
      height: 75,
      color: rgb(0.97, 0.97, 1), // Very light blue
    });

    const materials = [
      ['Structure:', modelDetails?.structure, 'Hardware:', modelDetails?.hardware],
      ['Body:', modelDetails?.body_material, 'Filling:', modelDetails?.infill]
    ];

    materials.forEach(([label1, value1, label2, value2]) => {
      drawTextPage2(label1, 60, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value1), 170, yPosition);
      drawTextPage2(label2, 320, yPosition, 10, helveticaBold, primaryColor);
      drawTextPage2(formatValue(value2), 450, yPosition);
      yPosition -= 33;
    });

    // Add footer to the second page
    addFooter(page2, 2, 4);

    // Page 3 - Drawings
    const page3 = pdfDoc.addPage();
    // Add letterhead to the third page
    await addLetterhead(page3);
    
    yPosition = height - 150;
    
    const drawTextPage3 = (text, x, y, size = 10, font = helvetica, color = textColor) => {
      if (text) {
        try {
          page3.drawText(formatValue(text), { x, y, size, font, color });
        } catch (error) {
          console.error(`Error drawing text "${text}":`, error);
          page3.drawText("[Error displaying text]", { x, y, size, font, color });
        }
      }
    };

    // 5. Tower Model Drawings
    yPosition = addSectionTitle(page3, '5. TOWER MODEL DRAWINGS', yPosition);
    
    // Add placeholder for drawings
    page3.drawRectangle({
      x: 50,
      y: yPosition - 300,
      width: width - 100,
      height: 300,
      borderColor: secondaryColor,
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.98), // Light gray background
    });

    drawTextPage3('To be updated later', width / 2 - 60, yPosition - 150, 12, helveticaBold, primaryColor);

    // Add footer to the third page
    addFooter(page3, 3, 4);

    // Page 4 - Performance Curve
    const page4 = pdfDoc.addPage();
    // Add letterhead to the fourth page
    await addLetterhead(page4);
    
    yPosition = height - 150;
    
    const drawTextPage4 = (text, x, y, size = 10, font = helvetica, color = textColor) => {
      if (text) {
        try {
          page4.drawText(formatValue(text), { x, y, size, font, color });
        } catch (error) {
          console.error(`Error drawing text "${text}":`, error);
          page4.drawText("[Error displaying text]", { x, y, size, font, color });
        }
      }
    };

    // 6. Performance Curve
    yPosition = addSectionTitle(page4, '6. PERFORMANCE CURVE', yPosition);

    // Add placeholder for performance curve
    page4.drawRectangle({
      x: 50,
      y: yPosition - 300,
      width: width - 100,
      height: 300,
      borderColor: secondaryColor,
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.98), // Light gray background
    });

    drawTextPage4('Performance curve to be added later', width / 2 - 100, yPosition - 150, 12, helveticaBold, primaryColor);

    // Add footer to the fourth page
    addFooter(page4, 4, 4);

    // Embed performance curve if available - left commented out as requested
    // if (performanceCurveImage) {
    //   try {
    //     // Check if the image data is valid
    //     if (!(performanceCurveImage instanceof Uint8Array) && 
    //         !(performanceCurveImage instanceof ArrayBuffer) && 
    //         typeof performanceCurveImage !== 'string') {
          
    //       console.error('Invalid performance curve image format:', typeof performanceCurveImage);
    //       drawTextPage4('Performance curve image is in an invalid format', 50, height - 100);
    //     } else {
    //       const image = await pdfDoc.embedPng(performanceCurveImage);
    //       page4.drawImage(image, {
    //         x: 50,
    //         y: height - 400,
    //         width: 500,
    //         height: 300
    //       });
    //     }
    //   } catch (error) {
    //     console.error('Error embedding performance curve:', error);
    //     drawTextPage4('Error loading performance curve: ' + error.message, 50, height - 100);
    //   }
    // } else {
    //   drawTextPage4('Performance curve not available', 50, height - 100);
    // }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error in generateReport:', error);
    throw error;
  }
}

// Example usage in your component - with toast example included
export const handleGenerateReport = async (selectionData, performanceCurveImage, showToast) => {
  try {
    // Make sure the image is in the correct format
    let imageData = null;
    
    if (performanceCurveImage) {
      try {
        // If it's a URL/path to an image, fetch it first
        if (typeof performanceCurveImage === 'string' && (performanceCurveImage.startsWith('http') || performanceCurveImage.startsWith('/'))) {
          const response = await fetch(performanceCurveImage);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          imageData = new Uint8Array(arrayBuffer);
        } 
        // If it's an image element from the DOM
        else if (typeof performanceCurveImage === 'object' && performanceCurveImage.tagName === 'IMG') {
          // Create a canvas and draw the image to it
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = performanceCurveImage.width;
          canvas.height = performanceCurveImage.height;
          ctx.drawImage(performanceCurveImage, 0, 0);
          
          // Convert to PNG data URL
          const dataUrl = canvas.toDataURL('image/png');
          // Use the data URL directly - pdf-lib can handle data URLs
          imageData = dataUrl;
        }
        // If it's already in the right format (Uint8Array, ArrayBuffer, or data URL)
        else {
          imageData = performanceCurveImage;
        }
      } catch (error) {
        console.error('Error processing performance curve image:', error);
        // Continue without the image
        imageData = null;
      }
    }
    
    const pdfBytes = await generateReport(selectionData, imageData);
    
    // Create a Blob from the PDF bytes
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    // Create a download link and trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectionData?.project_name || 'cooling-tower'}-report.pdf`;
    link.click();
    
    // Optionally show success message if toast function is provided
    if (showToast?.success) {
      showToast.success('Report generated successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error generating report:', error);
    
    // Only call toast if it's been provided
    if (showToast?.error) {
      showToast.error('Failed to generate report: ' + error.message);
    }
    
    return false;
  }
};