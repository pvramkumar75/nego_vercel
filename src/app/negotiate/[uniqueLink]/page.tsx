'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  Clock, 
  FileText,
  AlertCircle 
} from 'lucide-react'

interface Message {
  id: string
  content: string
  role: 'BUYER' | 'SUPPLIER' | 'AI_BOT' | 'SYSTEM'
  timestamp: string
}

interface NegotiationTerm {
  id: string
  termType: string
  targetValue: string
  quotedValue?: string
  currentValue?: string
  agreedValue?: string
}

interface Item {
  id: string
  name: string
  description?: string
  quantity?: string
  unit?: string
  terms: NegotiationTerm[]
}

interface Negotiation {
  id: string
  name: string
  buyerName?: string
  companyName?: string
  supplierName?: string
  supplierRepresentative?: string
  status: 'ACTIVE' | 'CONCLUDED'
  currency: string
  createdAt: string
  updatedAt: string
  terms: NegotiationTerm[]
  items?: Item[]
  messages: Message[]
}

export default function NegotiationPage() {
  const params = useParams()
  const uniqueLink = params.uniqueLink as string
  
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchNegotiation()
  }, [uniqueLink])

  const fetchNegotiation = async () => {
    try {
      const response = await fetch(`/api/negotiations/${uniqueLink}`)
      
      if (response.ok) {
        const data = await response.json()
        setNegotiation(data.negotiation)
        setMessages(data.negotiation.messages || [])
        
        // Send initial AI message if this is a new negotiation
        if (data.negotiation.messages.length === 0) {
          await sendInitialAIMessage(data.negotiation)
        }
      } else {
        const errorData = await response.json()
        console.error('Error fetching negotiation:', errorData)
      }
    } catch (error) {
      console.error('Error fetching negotiation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendInitialAIMessage = async (negotiationData: Negotiation) => {
    const currency = negotiationData.currency || 'USD'
    const currencySymbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
    
    // Get the first item for the initial message
    const firstItem = negotiationData.items?.[0]
    const itemName = firstItem?.name || 'the item'
    const companyName = negotiationData.companyName || 'our company'
    const buyerName = negotiationData.buyerName || 'AI Bot'
    
    // Get price terms for the table
    const priceTerms = firstItem?.terms
      ?.filter(term => (term.termType === 'PRICE' || term.termType === 'QUOTED_PRICE') && term.targetValue)
      ?.map(term => {
        const quotedValue = term.quotedValue || term.targetValue
        return `${term.termType.replace('_', ' ')}: ${currencySymbol}${term.targetValue} (Target) / ${currencySymbol}${quotedValue} (Quoted)`
      })
      ?.join('\n')

    const otherTerms = firstItem?.terms
      ?.filter(term => term.termType !== 'PRICE' && term.termType !== 'QUOTED_PRICE' && term.targetValue)
      ?.map(term => {
        const quotedValue = term.quotedValue || term.targetValue
        return `${term.termType.replace('_', ' ')}: ${term.targetValue} (Target) / ${quotedValue} (Quoted)`
      })
      ?.join('\n')

    const termsTable = `
Target Negotiation Terms:
| Term | Target | Quoted |
|------|---------|---------|
${priceTerms ? priceTerms.split('\n').map(line => {
  const [term, values] = line.split(':')
  const [target, quoted] = values?.split(' / ') || ['', '']
  return `| ${term?.trim()} | ${target?.replace('Target', '').trim()} | ${quoted?.replace('Quoted', '').trim()} |`
}).join('\n') : ''}
${otherTerms ? otherTerms.split('\n').map(line => {
  const [term, values] = line.split(':')
  const [target, quoted] = values?.split(' / ') || ['', '']
  return `| ${term?.trim()} | ${target?.replace('Target', '').trim()} | ${quoted?.replace('Quoted', '').trim()} |`
}).join('\n') : ''}
`

    const initialMessage = `Hello, thanks for the quotation for "${itemName}". I am ${buyerName} on behalf of ${companyName}. I am trained to conduct the negotiation in a professional way and ensure you that the process shall be fair and logical.

${termsTable}

Please share your proposal and we can work towards reaching a mutually beneficial agreement.`

    try {
      const response = await fetch(`/api/negotiations/${uniqueLink}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: initialMessage,
          role: 'AI_BOT'
        })
      })

      if (response.ok) {
        const newMessage = await response.json()
        setMessages(prev => [...prev, newMessage])
      }
    } catch (error) {
      console.error('Error sending initial AI message:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return

    setIsSending(true)
    try {
      // Send supplier message
      const response = await fetch(`/api/negotiations/${uniqueLink}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: inputMessage,
          role: 'SUPPLIER'
        })
      })

      if (response.ok) {
        const newMessage = await response.json()
        setMessages(prev => [...prev, newMessage])
        setInputMessage('')

        // Generate AI response
        setTimeout(() => {
          generateAIResponse(inputMessage)
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const generateAIResponse = async (supplierMessage: string) => {
    try {
      const response = await fetch(`/api/negotiations/${uniqueLink}/ai-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: supplierMessage,
          negotiationId: negotiation?.id
        })
      })

      if (response.ok) {
        const aiMessage = await response.json()
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
    }
  }

  const concludeNegotiation = async () => {
    try {
      const response = await fetch(`/api/negotiations/${uniqueLink}/conclude`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        
        // Generate summary
        const summary = generateNegotiationSummary(negotiation!, messages)
        
        const concludeMessage = {
          id: Date.now().toString(),
          content: summary,
          role: 'SYSTEM' as const,
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, concludeMessage])
        setNegotiation(prev => prev ? { ...prev, status: 'CONCLUDED' } : null)
      }
    } catch (error) {
      console.error('Error concluding negotiation:', error)
    }
  }

  const generateNegotiationSummary = (negotiationData: Negotiation, messageList: Message[]) => {
    const currency = negotiationData.currency || 'USD'
    const currencySymbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
    
    // Get all terms from items and negotiation
    const allTerms = negotiationData.items?.flatMap(item => item.terms).concat(negotiationData.terms) || []
    
    // Get price terms
    const priceTerms = allTerms.filter(term => term.termType === 'PRICE' || term.termType === 'QUOTED_PRICE')
    const quotedPrice = priceTerms.find(term => term.termType === 'QUOTED_PRICE')?.targetValue || 'N/A'
    const targetPrice = priceTerms.find(term => term.termType === 'PRICE')?.targetValue || 'N/A'
    const finalPrice = priceTerms.find(term => term.agreedValue)?.agreedValue || 
                      priceTerms.find(term => term.currentValue)?.currentValue || 'N/A'
    
    // Get other agreed terms
    const otherAgreedTerms = allTerms
      .filter(term => term.agreedValue && term.termType !== 'PRICE' && term.termType !== 'QUOTED_PRICE')
      .map(term => `• ${term.termType.replace('_', ' ')}: ${term.agreedValue}`)
      .join('\n')

    const messageCount = messageList.length
    const duration = Math.ceil((new Date().getTime() - new Date(negotiationData.createdAt).getTime()) / (1000 * 60 * 60 * 24))

    let summary = `Thanks for giving time for the negotiation session, we appreciate your participation and below is the summary\n\n`
    summary += `Quoted price was "${currencySymbol}${quotedPrice}" and our target price was "${currencySymbol}${targetPrice}", the final agreed price is "${currencySymbol}${finalPrice}" with the following terms:\n`
    
    if (otherAgreedTerms) {
      summary += `${otherAgreedTerms}\n`
    }
    
    summary += `\nAfter our internal review we shall get back to you soon.`

    return summary
  }

  const exportToPDF = async () => {
    try {
      const response = await fetch(`/api/negotiations/${uniqueLink}/export-pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `negotiation-${negotiation?.name || 'export'}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'AI_BOT':
        return <Bot className="w-4 h-4" />
      case 'SUPPLIER':
        return <User className="w-4 h-4" />
      case 'BUYER':
        return <User className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getRoleDisplayName = (role: string, negotiation: Negotiation | null) => {
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'AI_BOT':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'SUPPLIER':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'BUYER':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Loading negotiation...</p>
        </div>
      </div>
    )
  }

  if (!negotiation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Negotiation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600">
              The negotiation link you're trying to access is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {negotiation.name}
                  <Badge variant={negotiation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {negotiation.status === 'ACTIVE' ? 'Active' : 'Concluded'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {negotiation.supplierName ? `Supplier: ${negotiation.supplierName}` : 'Supplier Negotiation'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {negotiation.status === 'ACTIVE' && (
                  <Button onClick={concludeNegotiation} variant="outline">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Conclude Negotiation
                  </Button>
                )}
                <Button onClick={exportToPDF} variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Terms Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Negotiation Terms</CardTitle>
          </CardHeader>
          <CardContent>
            {negotiation.items && negotiation.items.length > 0 ? (
              <div className="space-y-6">
                {negotiation.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="space-y-3">
                    <h4 className="font-medium text-lg">{item.name || `Item ${itemIndex + 1}`}</h4>
                    {item.description && (
                      <p className="text-sm text-slate-600">{item.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {item.terms
                        .filter(term => term.targetValue)
                        .map((term, termIndex) => (
                          <div key={termIndex} className="p-3 bg-slate-50 rounded-lg">
                            <div className="font-medium text-sm text-slate-700 mb-1">
                              {term.termType.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-slate-600">
                              Target: {term.targetValue}
                            </div>
                            {term.quotedValue && (
                              <div className="text-sm text-blue-600 mt-1">
                                Quoted: {term.quotedValue}
                              </div>
                            )}
                            {term.agreedValue && (
                              <div className="text-sm text-green-600 mt-1">
                                Agreed: {term.agreedValue}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {negotiation.terms
                  .filter(term => term.targetValue)
                  .map((term, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg">
                      <div className="font-medium text-sm text-slate-700 mb-1">
                        {term.termType.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-slate-600">
                        Target: {term.targetValue}
                      </div>
                      {term.quotedValue && (
                        <div className="text-sm text-blue-600 mt-1">
                          Quoted: {term.quotedValue}
                        </div>
                      )}
                      {term.agreedValue && (
                        <div className="text-sm text-green-600 mt-1">
                          Agreed: {term.agreedValue}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle>Negotiation Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getRoleColor(message.role)}`}>
                      {getRoleIcon(message.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getRoleDisplayName(message.role, negotiation)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border text-sm">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {negotiation.status === 'ACTIVE' && (
              <>
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      disabled={isSending}
                    />
                    <Button onClick={sendMessage} disabled={isSending || !inputMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}