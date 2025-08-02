'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  Eye, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  FileText,
  Plus,
  Search,
  Users,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

interface Negotiation {
  id: string
  name: string
  status: 'ACTIVE' | 'CONCLUDED'
  supplierEmail?: string
  supplierName?: string
  uniqueLink: string
  createdAt: string
  concludedAt?: string
  messages: Array<{
    id: string
    content: string
    role: 'BUYER' | 'SUPPLIER' | 'AI_BOT' | 'SYSTEM'
    timestamp: string
  }>
  terms: Array<{
    termType: string
    targetValue: string
    agreedValue?: string
  }>
}

export default function Dashboard() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [filteredNegotiations, setFilteredNegotiations] = useState<Negotiation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNegotiations()
  }, [])

  useEffect(() => {
    filterNegotiations()
  }, [negotiations, searchTerm])

  const fetchNegotiations = async () => {
    try {
      const response = await fetch('/api/negotiations')
      if (response.ok) {
        const data = await response.json()
        setNegotiations(data.negotiations || [])
      }
    } catch (error) {
      console.error('Error fetching negotiations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterNegotiations = () => {
    if (!searchTerm) {
      setFilteredNegotiations(negotiations)
      return
    }

    const filtered = negotiations.filter(negotiation =>
      negotiation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      negotiation.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      negotiation.supplierEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredNegotiations(filtered)
  }

  const activeNegotiations = filteredNegotiations.filter(n => n.status === 'ACTIVE')
  const concludedNegotiations = filteredNegotiations.filter(n => n.status === 'CONCLUDED')

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'default' : 'secondary'
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'AI_BOT':
        return '🤖'
      case 'SUPPLIER':
        return '👤'
      case 'BUYER':
        return '👔'
      default:
        return '📝'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Negotiation Dashboard</h1>
            <p className="text-slate-600 mt-1">Monitor and manage your supplier negotiations</p>
          </div>
          <Link href="/">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Negotiation
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Negotiations</p>
                  <p className="text-2xl font-bold text-slate-900">{negotiations.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeNegotiations.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Concluded</p>
                  <p className="text-2xl font-bold text-slate-600">{concludedNegotiations.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Suppliers</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Array.from(new Set(negotiations.map(n => n.supplierEmail).filter((email): email is string => Boolean(email)))).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search negotiations by name, supplier, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Negotiations Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active Negotiations ({activeNegotiations.length})
            </TabsTrigger>
            <TabsTrigger value="concluded">
              Concluded ({concludedNegotiations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeNegotiations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Negotiations</h3>
                  <p className="text-slate-600 mb-4">Start a new negotiation to see it here</p>
                  <Link href="/">
                    <Button>Create New Negotiation</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeNegotiations.map((negotiation) => (
                  <Card key={negotiation.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {negotiation.name}
                            <Badge variant={getStatusColor(negotiation.status)}>
                              {negotiation.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {negotiation.supplierName && `Supplier: ${negotiation.supplierName}`}
                            {negotiation.supplierEmail && ` (${negotiation.supplierEmail})`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/negotiation/${negotiation.uniqueLink}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Buyer View
                            </Button>
                          </Link>
                          <Link href={`/negotiate/${negotiation.uniqueLink}`}>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Supplier View
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Terms Overview */}
                        <div>
                          <h4 className="font-medium text-sm text-slate-700 mb-2">Terms</h4>
                          <div className="space-y-1">
                            {negotiation.terms
                              .filter(term => term.targetValue)
                              .slice(0, 3)
                              .map((term, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{term.termType.replace('_', ' ')}:</span>
                                  <span className="text-slate-600 ml-1">{term.targetValue}</span>
                                </div>
                              ))}
                            {negotiation.terms.filter(term => term.targetValue).length > 3 && (
                              <div className="text-sm text-slate-500">
                                +{negotiation.terms.filter(term => term.targetValue).length - 3} more terms
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <div>
                          <h4 className="font-medium text-sm text-slate-700 mb-2">Recent Activity</h4>
                          <ScrollArea className="h-20">
                            <div className="space-y-1">
                              {negotiation.messages.slice(-3).map((message) => (
                                <div key={message.id} className="text-sm">
                                  <span className="mr-1">{getRoleIcon(message.role)}</span>
                                  <span className="font-medium">
                                    {message.role.replace('_', ' ')}:
                                  </span>
                                  <span className="text-slate-600 ml-1 truncate">
                                    {message.content}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-2">
                                    {formatTime(message.timestamp)}
                                  </span>
                                </div>
                              ))}
                              {negotiation.messages.length === 0 && (
                                <div className="text-sm text-slate-500">No messages yet</div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>Created: {formatDate(negotiation.createdAt)}</span>
                          <span>{negotiation.messages.length} messages</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="concluded" className="space-y-4">
            {concludedNegotiations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Concluded Negotiations</h3>
                  <p className="text-slate-600">Completed negotiations will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {concludedNegotiations.map((negotiation) => (
                  <Card key={negotiation.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {negotiation.name}
                            <Badge variant={getStatusColor(negotiation.status)}>
                              {negotiation.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {negotiation.supplierName && `Supplier: ${negotiation.supplierName}`}
                            {negotiation.supplierEmail && ` (${negotiation.supplierEmail})`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/negotiation/${negotiation.uniqueLink}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Buyer View
                            </Button>
                          </Link>
                          <Link href={`/negotiate/${negotiation.uniqueLink}`}>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Supplier View
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Agreed Terms */}
                        <div>
                          <h4 className="font-medium text-sm text-slate-700 mb-2">Agreed Terms</h4>
                          <div className="space-y-1">
                            {negotiation.terms
                              .filter(term => term.agreedValue)
                              .map((term, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{term.termType.replace('_', ' ')}:</span>
                                  <span className="text-green-600 ml-1">{term.agreedValue}</span>
                                </div>
                              ))}
                            {negotiation.terms.filter(term => term.agreedValue).length === 0 && (
                              <div className="text-sm text-slate-500">No terms agreed yet</div>
                            )}
                          </div>
                        </div>

                        {/* Conclusion Info */}
                        <div>
                          <h4 className="font-medium text-sm text-slate-700 mb-2">Conclusion Details</h4>
                          <div className="space-y-1 text-sm">
                            {negotiation.concludedAt && (
                              <div>
                                <span className="font-medium">Concluded:</span>
                                <span className="text-slate-600 ml-1">
                                  {formatDate(negotiation.concludedAt)}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Duration:</span>
                              <span className="text-slate-600 ml-1">
                                {Math.ceil(
                                  (new Date(negotiation.concludedAt || Date.now()).getTime() - 
                                   new Date(negotiation.createdAt).getTime()) / 
                                  (1000 * 60 * 60 * 24)
                                )} days
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Total Messages:</span>
                              <span className="text-slate-600 ml-1">
                                {negotiation.messages.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}