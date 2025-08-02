'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link as LinkIcon, Copy, CheckCircle, Plus, Trash2 } from 'lucide-react'

interface NegotiationTerm {
  price: string
  quotedPrice: string
  paymentTerms: string
  freight: string
  deliverySchedule: string
  warranty: string
  ldClause: string
}

interface Item {
  id: string
  name: string
  description: string
  quantity: string
  unit: string
  terms: NegotiationTerm
}

interface Supplier {
  id: string
  name: string
  email: string
  representative: string
  items: Item[]
}

interface NegotiationData {
  name: string
  buyerName: string
  companyName: string
  currency: string
  suppliers: Supplier[]
}

export default function Home() {
  const [negotiationData, setNegotiationData] = useState<NegotiationData>({
    name: '',
    buyerName: '',
    companyName: '',
    currency: 'USD',
    suppliers: []
  })
  
  const [generatedLink, setGeneratedLink] = useState<string>('')
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addSupplier = () => {
    const newSupplier: Supplier = {
      id: Date.now().toString(),
      name: '',
      email: '',
      representative: '',
      items: [{
        id: Date.now().toString(),
        name: '',
        description: '',
        quantity: '',
        unit: '',
        terms: {
          price: '',
          quotedPrice: '',
          paymentTerms: '',
          freight: '',
          deliverySchedule: '',
          warranty: '',
          ldClause: ''
        }
      }]
    }
    setNegotiationData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, newSupplier]
    }))
  }

  const removeSupplier = (supplierId: string) => {
    setNegotiationData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== supplierId)
    }))
  }

  const addItem = (supplierId: string) => {
    setNegotiationData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(supplier => 
        supplier.id === supplierId 
          ? {
              ...supplier,
              items: [...supplier.items, {
                id: Date.now().toString(),
                name: '',
                description: '',
                quantity: '',
                unit: '',
                terms: {
                  price: '',
                  quotedPrice: '',
                  paymentTerms: '',
                  freight: '',
                  deliverySchedule: '',
                  warranty: '',
                  ldClause: ''
                }
              }]
            }
          : supplier
      )
    }))
  }

  const removeItem = (supplierId: string, itemId: string) => {
    setNegotiationData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(supplier => 
        supplier.id === supplierId 
          ? {
              ...supplier,
              items: supplier.items.filter(item => item.id !== itemId)
            }
          : supplier
      )
    }))
  }

  const updateSupplier = (supplierId: string, field: keyof Supplier, value: string) => {
    setNegotiationData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(supplier => 
        supplier.id === supplierId 
          ? { ...supplier, [field]: value }
          : supplier
      )
    }))
  }

  const updateItem = (supplierId: string, itemId: string, field: keyof Item, value: string) => {
    setNegotiationData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(supplier => 
        supplier.id === supplierId 
          ? {
              ...supplier,
              items: supplier.items.map(item => 
                item.id === itemId 
                  ? { ...item, [field]: value }
                  : item
              )
            }
          : supplier
      )
    }))
  }

  const updateItemTerm = (supplierId: string, itemId: string, term: keyof NegotiationTerm, value: string) => {
    setNegotiationData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(supplier => 
        supplier.id === supplierId 
          ? {
              ...supplier,
              items: supplier.items.map(item => 
                item.id === itemId 
                  ? {
                      ...item,
                      terms: { ...item.terms, [term]: value }
                    }
                  : item
              )
            }
          : supplier
      )
    }))
  }

  const handleInputChange = (field: keyof NegotiationData, value: string) => {
    setNegotiationData(prev => ({ ...prev, [field]: value }))
  }

  const handleStartNegotiation = async () => {
    setIsLoading(true)
    setErrors({})
    try {
      const response = await fetch('/api/negotiations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(negotiationData)
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        const { uniqueLink } = responseData
        const fullLink = `${window.location.origin}/negotiate/${uniqueLink}`
        setGeneratedLink(fullLink)
        
        // Reset form after successful creation
        setNegotiationData({
          name: '',
          buyerName: '',
          companyName: '',
          currency: 'USD',
          suppliers: []
        })
      } else {
        console.error('Server error:', responseData)
        
        // Handle validation errors
        if (responseData.details && Array.isArray(responseData.details)) {
          const errorMap: Record<string, string> = {}
          responseData.details.forEach((err: any) => {
            errorMap[err.field] = err.message
          })
          setErrors(errorMap)
          
          // Show first error as alert
          const firstError = responseData.details[0]
          alert(`Validation Error: ${firstError.message}`)
        } else {
          alert(`Error: ${responseData.error || 'Failed to create negotiation'}`)
        }
      }
    } catch (error) {
      console.error('Error creating negotiation:', error)
      alert('Failed to create negotiation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const cleanupDatabase = async () => {
    if (confirm('Are you sure you want to clean up all negotiations? This is for testing purposes only.')) {
      try {
        const response = await fetch('/api/cleanup', {
          method: 'POST'
        })
        
        if (response.ok) {
          alert('Database cleaned successfully!')
          setGeneratedLink('') // Clear the generated link
        } else {
          alert('Failed to clean database')
        }
      } catch (error) {
        console.error('Error cleaning database:', error)
        alert('Failed to clean database')
      }
    }
  }

  const isFormValid = negotiationData.name && 
    negotiationData.buyerName && 
    negotiationData.companyName &&
    negotiationData.suppliers.length > 0 &&
    negotiationData.suppliers.some(supplier => 
      supplier.name && 
      supplier.email && 
      supplier.items.some(item => 
        item.name && 
        (item.terms.price || item.terms.quotedPrice)
      )
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="outline">
                View Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-slate-800">Supplier Negotiation Platform</h1>
            <Button onClick={cleanupDatabase} variant="outline" size="sm">
              Cleanup DB
            </Button>
          </div>
          <p className="text-lg text-slate-600">AI-powered negotiation assistant for optimal supplier terms</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Create New Negotiation</span>
              <Badge variant="secondary">Beta</Badge>
            </CardTitle>
            <CardDescription>
              Set up your negotiation parameters and generate a secure link for your supplier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers & Items</TabsTrigger>
                <TabsTrigger value="terms">Negotiation Terms</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="negotiationName">Negotiation Name</Label>
                    <Input
                      id="negotiationName"
                      placeholder="e.g., Q4 2024 Component Procurement"
                      value={negotiationData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="buyerName">Buyer Name</Label>
                    <Input
                      id="buyerName"
                      placeholder="e.g., John Smith"
                      value={negotiationData.buyerName}
                      onChange={(e) => handleInputChange('buyerName', e.target.value)}
                      className={errors.buyerName ? 'border-red-500' : ''}
                    />
                    {errors.buyerName && <p className="text-sm text-red-500">{errors.buyerName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Select value={negotiationData.companyName} onValueChange={(value) => handleInputChange('companyName', value)}>
                      <SelectTrigger className={errors.companyName ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TPL">TPL</SelectItem>
                        <SelectItem value="TCL">TCL</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={negotiationData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="suppliers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Suppliers & Items</h3>
                  <Button onClick={addSupplier} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplier
                  </Button>
                </div>
                
                {negotiationData.suppliers.map((supplier, supplierIndex) => (
                  <Card key={supplier.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Supplier {supplierIndex + 1}</h4>
                      {negotiationData.suppliers.length > 1 && (
                        <Button 
                          onClick={() => removeSupplier(supplier.id)} 
                          variant="outline" 
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor={`supplier-name-${supplier.id}`}>Supplier Name</Label>
                        <Input
                          id={`supplier-name-${supplier.id}`}
                          placeholder="e.g., ABC Supplier Ltd."
                          value={supplier.name}
                          onChange={(e) => updateSupplier(supplier.id, 'name', e.target.value)}
                          className={errors[`suppliers.${supplierIndex}.name`] ? 'border-red-500' : ''}
                        />
                        {errors[`suppliers.${supplierIndex}.name`] && (
                          <p className="text-sm text-red-500">{errors[`suppliers.${supplierIndex}.name`]}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`supplier-email-${supplier.id}`}>Supplier Email</Label>
                        <Input
                          id={`supplier-email-${supplier.id}`}
                          type="email"
                          placeholder="supplier@company.com"
                          value={supplier.email}
                          onChange={(e) => updateSupplier(supplier.id, 'email', e.target.value)}
                          className={errors[`suppliers.${supplierIndex}.email`] ? 'border-red-500' : ''}
                        />
                        {errors[`suppliers.${supplierIndex}.email`] && (
                          <p className="text-sm text-red-500">{errors[`suppliers.${supplierIndex}.email`]}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`supplier-representative-${supplier.id}`}>Representative Name</Label>
                        <Input
                          id={`supplier-representative-${supplier.id}`}
                          placeholder="e.g., Jane Doe"
                          value={supplier.representative}
                          onChange={(e) => updateSupplier(supplier.id, 'representative', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="font-medium">Items</h5>
                        <Button onClick={() => addItem(supplier.id)} variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                      
                      {supplier.items.map((item, itemIndex) => (
                        <Card key={item.id} className="p-3">
                          <div className="flex justify-between items-start mb-3">
                            <h6 className="font-medium text-sm">Item {itemIndex + 1}</h6>
                            {supplier.items.length > 1 && (
                              <Button 
                                onClick={() => removeItem(supplier.id, item.id)} 
                                variant="outline" 
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`item-name-${item.id}`}>Item Name</Label>
                              <Input
                                id={`item-name-${item.id}`}
                                placeholder="e.g., Electronic Component"
                                value={item.name}
                                onChange={(e) => updateItem(supplier.id, item.id, 'name', e.target.value)}
                                className={errors[`suppliers.${supplierIndex}.items.${itemIndex}.name`] ? 'border-red-500' : ''}
                              />
                              {errors[`suppliers.${supplierIndex}.items.${itemIndex}.name`] && (
                                <p className="text-sm text-red-500">{errors[`suppliers.${supplierIndex}.items.${itemIndex}.name`]}</p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`item-quantity-${item.id}`}>Quantity</Label>
                              <Input
                                id={`item-quantity-${item.id}`}
                                placeholder="e.g., 1000"
                                value={item.quantity}
                                onChange={(e) => updateItem(supplier.id, item.id, 'quantity', e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`item-unit-${item.id}`}>Unit</Label>
                              <Input
                                id={`item-unit-${item.id}`}
                                placeholder="e.g., pieces"
                                value={item.unit}
                                onChange={(e) => updateItem(supplier.id, item.id, 'unit', e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor={`item-description-${item.id}`}>Description</Label>
                              <Textarea
                                id={`item-description-${item.id}`}
                                placeholder="e.g., High-quality electronic component for industrial use"
                                value={item.description}
                                onChange={(e) => updateItem(supplier.id, item.id, 'description', e.target.value)}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                ))}
                
                {negotiationData.suppliers.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <p>No suppliers added yet. Click "Add Supplier" to get started.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="terms" className="space-y-4">
                {negotiationData.suppliers.map((supplier, supplierIndex) => (
                  <div key={supplier.id} className="space-y-4">
                    <h3 className="text-lg font-medium">{supplier.name || `Supplier ${supplierIndex + 1}`} - Negotiation Terms</h3>
                    
                    {supplier.items.map((item, itemIndex) => (
                      <Card key={item.id} className="p-4">
                        <h4 className="font-medium mb-4">{item.name || `Item ${itemIndex + 1}`}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`price-${item.id}`}>Target Price</Label>
                            <Input
                              id={`price-${item.id}`}
                              placeholder="e.g., 100 per unit"
                              value={item.terms.price}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'price', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`quotedPrice-${item.id}`}>Quoted Price</Label>
                            <Input
                              id={`quotedPrice-${item.id}`}
                              placeholder="e.g., 120 per unit"
                              value={item.terms.quotedPrice}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'quotedPrice', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`paymentTerms-${item.id}`}>Payment Terms</Label>
                            <Input
                              id={`paymentTerms-${item.id}`}
                              placeholder="e.g., Net 30 days"
                              value={item.terms.paymentTerms}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'paymentTerms', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`freight-${item.id}`}>Freight Terms</Label>
                            <Input
                              id={`freight-${item.id}`}
                              placeholder="e.g., FOB Origin"
                              value={item.terms.freight}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'freight', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`deliverySchedule-${item.id}`}>Delivery Schedule</Label>
                            <Input
                              id={`deliverySchedule-${item.id}`}
                              placeholder="e.g., 4 weeks from order"
                              value={item.terms.deliverySchedule}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'deliverySchedule', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`warranty-${item.id}`}>Warranty Terms</Label>
                            <Input
                              id={`warranty-${item.id}`}
                              placeholder="e.g., 12 months warranty"
                              value={item.terms.warranty}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'warranty', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`ldClause-${item.id}`}>LD Clause</Label>
                            <Textarea
                              id={`ldClause-${item.id}`}
                              placeholder="e.g., 1% per week delay, max 10%"
                              value={item.terms.ldClause}
                              onChange={(e) => updateItemTerm(supplier.id, item.id, 'ldClause', e.target.value)}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
                
                {negotiationData.suppliers.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <p>Please add suppliers and items first to configure negotiation terms.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleStartNegotiation}
                disabled={!isFormValid || isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? 'Creating...' : 'Start Negotiation'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {generatedLink && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Negotiation Link Generated
              </CardTitle>
              <CardDescription>
                Share this secure link with your supplier to begin negotiation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Input
                  value={generatedLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  {isCopied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Send this link via email or WhatsApp to your supplier
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}