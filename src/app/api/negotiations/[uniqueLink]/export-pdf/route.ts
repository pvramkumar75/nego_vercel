import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uniqueLink: string }> }
) {
  try {
    const { uniqueLink } = await params

    // Find the negotiation with all related data
    const negotiation = await db.negotiation.findUnique({
      where: { uniqueLink },
      include: {
        buyer: true,
        terms: {
          orderBy: { termType: 'asc' }
        },
        items: {
          include: {
            terms: {
              orderBy: { termType: 'asc' }
            },
            supplier: true
          },
          orderBy: { createdAt: 'asc' }
        },
        suppliers: {
          orderBy: { createdAt: 'asc' }
        },
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    if (!negotiation) {
      return NextResponse.json(
        { error: 'Negotiation not found' },
        { status: 404 }
      )
    }

    // Generate HTML content for PDF
    const htmlContent = generateNegotiationHTML(negotiation)

    // For now, return HTML content that can be saved as PDF
    // In a production environment, you would use a PDF library like Puppeteer or jsPDF
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="negotiation-${negotiation.name}.html"`
      }
    })
  } catch (error) {
    console.error('Error exporting negotiation:', error)
    return NextResponse.json(
      { error: 'Failed to export negotiation' },
      { status: 500 }
    )
  }
}

function generateNegotiationHTML(negotiation: any) {
  // Get all terms from negotiation and items
  const allTerms = [
    ...(negotiation.terms || []),
    ...(negotiation.items?.flatMap((item: any) => item.terms) || [])
  ]
  
  // Get price information
  const priceTerms = allTerms.filter((term: any) => term.termType === 'PRICE' || term.termType === 'QUOTED_PRICE')
  const quotedPrice = priceTerms.find((term: any) => term.termType === 'QUOTED_PRICE')?.targetValue || 'N/A'
  const targetPrice = priceTerms.find((term: any) => term.termType === 'PRICE')?.targetValue || 'N/A'
  const finalPrice = priceTerms.find((term: any) => term.agreedValue)?.agreedValue || 
                    priceTerms.find((term: any) => term.currentValue)?.currentValue || 'N/A'
  
  // Get other agreed terms
  const otherAgreedTerms = allTerms
    .filter((term: any) => term.agreedValue && term.termType !== 'PRICE' && term.termType !== 'QUOTED_PRICE')
    .map((term: any) => `• ${term.termType.replace('_', ' ')}: ${term.agreedValue}`)
    .join('<br>')

  // Generate suppliers HTML
  const suppliersHTML = negotiation.suppliers?.map((supplier: any, index: number) => {
    const supplierItems = negotiation.items?.filter((item: any) => item.supplierId === supplier.id) || []
    const itemsHTML = supplierItems.map((item: any) => {
      const itemTerms = item.terms || []
      const termsHTML = itemTerms.map((term: any) => `
        <tr>
          <td style="padding: 4px; border: 1px solid #ddd; font-size: 12px;">${term.termType.replace('_', ' ')}</td>
          <td style="padding: 4px; border: 1px solid #ddd; font-size: 12px;">${term.targetValue || 'N/A'}</td>
          <td style="padding: 4px; border: 1px solid #ddd; font-size: 12px;">${term.quotedValue || 'N/A'}</td>
          <td style="padding: 4px; border: 1px solid #ddd; font-size: 12px;">${term.agreedValue || 'Not agreed'}</td>
        </tr>
      `).join('')
      
      return `
        <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #495057;">${item.name}</h4>
          ${item.description ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6c757d;">${item.description}</p>` : ''}
          ${item.quantity ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Quantity:</strong> ${item.quantity} ${item.unit || 'units'}</p>` : ''}
          ${itemTerms.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
              <thead>
                <tr>
                  <th style="padding: 4px; border: 1px solid #ddd; background-color: #f2f2f2;">Term</th>
                  <th style="padding: 4px; border: 1px solid #ddd; background-color: #f2f2f2;">Target</th>
                  <th style="padding: 4px; border: 1px solid #ddd; background-color: #f2f2f2;">Quoted</th>
                  <th style="padding: 4px; border: 1px solid #ddd; background-color: #f2f2f2;">Agreed</th>
                </tr>
              </thead>
              <tbody>
                ${termsHTML}
              </tbody>
            </table>
          ` : ''}
        </div>
      `
    }).join('')

    return `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #dee2e6; border-radius: 6px;">
        <h3 style="margin: 0 0 10px 0; color: #007bff;">Supplier ${index + 1}: ${supplier.name}</h3>
        ${supplier.representative ? `<p style="margin: 0 0 5px 0;"><strong>Representative:</strong> ${supplier.representative}</p>` : ''}
        ${supplier.email ? `<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${supplier.email}</p>` : ''}
        ${supplierItems.length > 0 ? `
          <div>
            <h4 style="margin: 0 0 8px 0; color: #495057;">Items:</h4>
            ${itemsHTML}
          </div>
        ` : '<p style="margin: 0; color: #6c757d; font-style: italic;">No items specified</p>'}
      </div>
    `
  }).join('') || '<p style="color: #6c757d; font-style: italic;">No suppliers specified</p>'

  const termsHTML = allTerms
    .map((term: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${term.termType.replace('_', ' ')}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${term.targetValue || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${term.quotedValue || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${term.agreedValue || 'Not agreed'}</td>
      </tr>
    `).join('')

  const messagesHTML = negotiation.messages
    .map((message: any) => `
      <div style="margin-bottom: 16px; padding: 12px; background-color: ${getRoleBackgroundColor(message.role)}; border-radius: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">
          ${getRoleDisplayName(message.role, negotiation)} - ${new Date(message.timestamp).toLocaleString()}
        </div>
        <div>${message.content.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Negotiation Summary - ${negotiation.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #333; padding-bottom: 5px; }
        .section h3 { color: #007bff; margin-bottom: 15px; }
        .summary-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff; }
        .price-summary { font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .active { background-color: #d4edda; color: #155724; }
        .concluded { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Negotiation Summary</h1>
        <h2>${negotiation.name}</h2>
    </div>

    <div class="summary-box">
        <div class="price-summary">
            Final Price: ${finalPrice !== 'N/A' ? finalPrice : 'Not agreed'}
        </div>
        <p><strong>Quoted Price:</strong> ${quotedPrice}</p>
        <p><strong>Target Price:</strong> ${targetPrice}</p>
        ${otherAgreedTerms ? `<p><strong>Agreed Terms:</strong><br>${otherAgreedTerms}</p>` : ''}
    </div>

    <div class="section">
        <h2>Negotiation Details</h2>
        <p><strong>Buyer:</strong> ${negotiation.buyerName || negotiation.buyer.name} (${negotiation.buyer.email})</p>
        <p><strong>Company:</strong> ${negotiation.companyName || 'Not specified'}</p>
        <p><strong>Currency:</strong> ${negotiation.currency}</p>
        <p><strong>Status:</strong> <span class="status ${negotiation.status.toLowerCase()}">${negotiation.status}</span></p>
        <p><strong>Created:</strong> ${new Date(negotiation.createdAt).toLocaleString()}</p>
        ${negotiation.concludedAt ? `<p><strong>Concluded:</strong> ${new Date(negotiation.concludedAt).toLocaleString()}</p>` : ''}
    </div>

    <div class="section">
        <h2>Suppliers & Items</h2>
        ${suppliersHTML}
    </div>

    <div class="section">
        <h2>All Negotiation Terms</h2>
        <table>
            <thead>
                <tr>
                    <th>Term Type</th>
                    <th>Target Value</th>
                    <th>Quoted Value</th>
                    <th>Agreed Value</th>
                </tr>
            </thead>
            <tbody>
                ${termsHTML}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Negotiation Transcript</h2>
        ${messagesHTML}
    </div>

    <div class="section">
        <p><em>Generated on ${new Date().toLocaleString()}</em></p>
    </div>
</body>
</html>
  `
}

function getRoleDisplayName(role: string, negotiation: any) {
  switch (role) {
    case 'AI_BOT':
      return `AI Bot (${negotiation?.buyerName || 'Buyer'})`
    case 'SUPPLIER':
      return negotiation?.supplierRepresentative || 'Supplier'
    case 'BUYER':
      return negotiation?.buyerName || 'Buyer'
    default:
      return role.replace('_', ' ')
  }
}

function getRoleBackgroundColor(role: string) {
  switch (role) {
    case 'AI_BOT':
      return '#e3f2fd'
    case 'SUPPLIER':
      return '#e8f5e8'
    case 'BUYER':
      return '#f3e5f5'
    case 'SYSTEM':
      return '#fff3e0'
    default:
      return '#f5f5f5'
  }
}