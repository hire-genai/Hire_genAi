"use client"

import { useState } from "react"
import PaymentCheckout from "@/components/billing/PaymentCheckout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/layout/Navbar"

export default function PaymentDemoPage() {
  const [customAmount, setCustomAmount] = useState("100")
  const [paymentAmount, setPaymentAmount] = useState(10000) // 10000 paise = ₹100
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentId, setPaymentId] = useState("")
  const [provider, setProvider] = useState("")

  const handleAmountChange = (value: string) => {
    setCustomAmount(value)
    const rupees = parseFloat(value) || 100
    setPaymentAmount(Math.round(rupees * 100)) // Convert to paise
  }

  const handlePaymentSuccess = (id: string, prov: string) => {
    setPaymentSuccess(true)
    setPaymentId(id)
    setProvider(prov)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/pricing">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Demo</h1>
          <p className="text-gray-600">Test Razorpay/PayPal integration without login</p>
        </div>

        {paymentSuccess ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-emerald-100 rounded-full">
                    <CheckCircle className="h-12 w-12 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-900 mb-2">Payment Successful!</h2>
                  <p className="text-emerald-700 mb-4">
                    Your payment has been processed successfully via {provider === 'razorpay' ? 'Razorpay' : 'PayPal'}
                  </p>
                  <div className="bg-white rounded-lg p-4 inline-block">
                    <p className="text-sm text-gray-600 mb-1">Payment ID:</p>
                    <p className="font-mono text-sm font-semibold text-gray-900">{paymentId}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setPaymentSuccess(false)
                    setPaymentId("")
                    setProvider("")
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Make Another Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Amount Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Amount</CardTitle>
                <CardDescription>Choose or enter custom amount to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={paymentAmount === 10000 ? "default" : "outline"}
                    onClick={() => {
                      setCustomAmount("100")
                      setPaymentAmount(10000)
                    }}
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold">₹100</div>
                      <div className="text-xs opacity-70">Starter</div>
                    </div>
                  </Button>
                  <Button
                    variant={paymentAmount === 50000 ? "default" : "outline"}
                    onClick={() => {
                      setCustomAmount("500")
                      setPaymentAmount(50000)
                    }}
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold">₹500</div>
                      <div className="text-xs opacity-70">Pro</div>
                    </div>
                  </Button>
                  <Button
                    variant={paymentAmount === 100000 ? "default" : "outline"}
                    onClick={() => {
                      setCustomAmount("1000")
                      setPaymentAmount(100000)
                    }}
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold">₹1,000</div>
                      <div className="text-xs opacity-70">Business</div>
                    </div>
                  </Button>
                  <Button
                    variant={paymentAmount === 500000 ? "default" : "outline"}
                    onClick={() => {
                      setCustomAmount("5000")
                      setPaymentAmount(500000)
                    }}
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold">₹5,000</div>
                      <div className="text-xs opacity-70">Enterprise</div>
                    </div>
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-amount">Custom Amount (₹)</Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Enter amount in rupees"
                  />
                  <p className="text-xs text-gray-500">
                    Amount in paise: {paymentAmount} (₹{(paymentAmount / 100).toFixed(2)})
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Checkout */}
            <div>
              <PaymentCheckout
                amount={paymentAmount}
                companyId="demo-payment"
                onPaymentSuccess={handlePaymentSuccess}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">For India (Razorpay):</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Click "Pay with Razorpay" button</li>
                <li>Choose payment method: UPI, Card, NetBanking, or Wallet</li>
                <li>Use Razorpay test credentials for testing</li>
                <li>Test Card: 4111 1111 1111 1111, CVV: 123, Expiry: Any future date</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">For International (PayPal):</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>PayPal button will appear automatically</li>
                <li>Login with PayPal sandbox account for testing</li>
                <li>Amount will be converted to USD (approx. 1 USD = 100 INR)</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <p className="font-semibold">Environment Variables Required:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 font-mono text-xs">
                <li>RAZORPAY_KEY_ID</li>
                <li>RAZORPAY_KEY_SECRET</li>
                <li>NEXT_PUBLIC_RAZORPAY_KEY_ID (for client-side)</li>
                <li>PAYPAL_CLIENT_ID (for international)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
