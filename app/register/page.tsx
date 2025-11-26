"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, User, Mail, Lock, Zap, CheckCircle, AlertCircle, Shield, ArrowRight,CircleArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { register } from "@/lib/auth"
import { useETrikeToast } from "@/components/ui/toast-container"
import Logo from "@/public/icon512_rounded.png";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const slides = [
  "/cyborg.png",
  "/d__3_-removebg-preview.png",
  "/mini-ebike-reference.png",
  "/t20.png",
  "/v9-tricycle.png",
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const router = useRouter()
  const toast = useETrikeToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreedToTerms) {
      toast.warning("Terms Required", "Please agree to the Terms of Service and Privacy Policy")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Password Mismatch", "Passwords do not match. Please try again.")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Weak Password", "Password must be at least 6 characters long.")
      return
    }

    setIsLoading(true)
    try {
      const user = await register(formData.email, formData.password, formData.name)
      if (user) {
        toast.success("Account Created!", `Welcome to YAMAARAW, ${user.name}! Please sign in to continue.`)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      toast.error("Registration Failed", error.message || "Failed to create account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "", bgColor: "" }

    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password),
    }

    score = Object.values(checks).filter(Boolean).length

    if (score < 2)
      return {
        strength: 1,
        label: "Weak",
        color: "text-red-400",
        bgColor: "bg-red-500",
      }
    if (score < 4)
      return {
        strength: 2,
        label: "Medium",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500",
      }
    if (score < 5)
      return {
        strength: 3,
        label: "Good",
        color: "text-blue-400",
        bgColor: "bg-blue-500",
      }
    return {
      strength: 4,
      label: "Strong",
      color: "text-green-400",
      bgColor: "bg-green-500",
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword

    const [current, setCurrent] = useState(0);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, 5000); // Change every 5 seconds
      return () => clearInterval(interval);
    }, []);

  return (
          <main className="min-h-screen grid grid-cols-1 sm:grid-cols-2"> 
            <div className="hidden lg:flex relative h-[100vh] w-full items-end overflow-hidden">
              <Image
                key={slides[current]}
                src={slides[current]}
                alt="Hero Slide"
                fill
                className="object-contain transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 text-white p-10 bg-gray-400 opacity-75 box-shadow-xl">
                  <h1 className="text-4xl font-bold my-5 opacity-100">Power Your Future</h1>
                    <p className="text-lg tracking-wide font-semibold">
                    Join YAMAARAW electronic future.
                    <br />
                      <span className="font-normal">
                      Experience cutting-edge electric vehicles that combine
                      performance, sustainability and innovation.
                      </span>
                    </p>
                </div>
            </div>

            <div className="flex-col bg-gradient-to-br from-s50 via-orange-50 to-slate-50 flex items-center justify-center p-4"> 
              <div className="absolute inset-0 opacity-10" 
                style={{
                  backgroundImage: `radial-gradient(circle, hsl(var(--ev-orange)) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }} 
                />
                <div className="space-y-2 lg:w-[60vh]"> 
                  <div className="flex flex-col items-center justify-center my-3"> 
                    <Image
                      src={Logo}
                      alt="Logo"
                      className="w-20 h-20 mb-2"
                    />
                    <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-none shadow-lg"> 
                      Electric Vehicle Store 
                    </Badge> 
                  </div> 
                  
                <div className="bg-white px-20 py-10 border shadow-xl rounded-xl opacity-100" style={{ opacity: 0.9 }}> 
                  <div className="flex"> 
                    <Link href="/"> 
                      <CircleArrowLeft className="w-8 h-8 pt-2 -ml-14 text-gray-500" /> 
                    </Link> 
                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6"> 
                        <TabsTrigger value="/login" asChild className="hover:bg-orange-600 hover:text-gray-100"> 
                          <Link href="/login"> Log In </Link> 
                        </TabsTrigger> 
                        <TabsTrigger value="/register" asChild className="hover:bg-orange-600 hover:text-gray-100"> 
                          <Link href="/register"> Register </Link> 
                        </TabsTrigger> 
                      </TabsList>

                      <div className="flex"> 
                        <h1 className="text-2xl font-bold text-orange-600">Join YAMAARAW!</h1> 
                      </div> 
                        <p className="text-gray-600">Register to have YAMAARAW account</p> 
                        <div className="mt-5"> 

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name Field */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-orange-500" />
                          <Input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="pl-10 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white"
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>

                      {/* Email Field */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-orange-500" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="pl-10 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white"
                            placeholder="Enter your email"
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-orange-500" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="pl-10 pr-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white"
                            placeholder="Create a strong password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Compact Password Strength Indicator */}
                        {formData.password && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Strength:</span>
                              <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                            </div>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4].map((level) => (
                                <div
                                  key={level}
                                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                    level <= passwordStrength.strength ? passwordStrength.bgColor : "bg-gray-600"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password Field */}
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-orange-500" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="pl-10 pr-12 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white"
                            placeholder="Confirm your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Compact Password Match Indicator */}
                        {formData.confirmPassword && (
                          <div className="mt-1 flex items-center space-x-2">
                            {passwordsMatch ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Passwords match</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-red-400">Passwords do not match</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Compact Terms Agreement */}
                      <div className="flex items-start space-x-3 p-3 bg-orange-900/20 rounded-xl border border-orange-700/30">
                        <input
                          id="agree-terms"
                          name="agree-terms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-0.5"
                        />
                        <div className="text-xs">
                          <label htmlFor="agree-terms" className="text-gray-200 font-medium">
                            I agree to the{" "}
                            <Link href="/terms" className="text-orange-400 hover:text-orange-300 font-medium">
                              Terms
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-orange-400 hover:text-orange-300 font-medium">
                              Privacy Policy
                            </Link>
                          </label>
                        </div>
                      </div>

                      {/* Compact Submit Button */}
                      <Button
                        type="submit"
                        disabled={isLoading || !passwordsMatch || !agreedToTerms}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 h-12 rounded-xl shadow-lg text-white font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed"
                        size="lg"
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Creating Account...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>Create Account</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </Button>
                    </form>
                    </div>
                  </Tabs>
                  </div>
                </div>
              </div>
              {/* Compact Security Features */}
              <div className="mt-3 p-3 bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-orange-700/30 shadow-lg">
                <div className="flex items-center space-x-3 text-xs text-gray-300">
                  <Shield className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-200">Your data is secure</p>
                    <p>We use industry-standard encryption to protect your information</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
  )
}
