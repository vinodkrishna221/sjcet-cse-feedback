import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/college-hero.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">CSE Department</h1>
              <p className="text-sm text-muted-foreground">Feedback Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={heroImage} 
            alt="College Campus" 
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-6">
              Student Feedback Portal
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Share your valuable feedback to help us improve the academic experience. 
              Your voice matters in shaping the future of education.
            </p>
          </div>

          {/* Login Options */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Student Login Card */}
            <Card className="card-gradient hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Student Login</CardTitle>
                <CardDescription className="text-base">
                  2nd Year CSE Students (Sections A & B)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">
                  Access the feedback form using your section and registration number
                </p>
                <Button 
                  onClick={() => navigate('/student-login')}
                  className="btn-hero w-full"
                  size="lg"
                >
                  Login as Student
                </Button>
              </CardContent>
            </Card>

            {/* Admin Login Card */}
            <Card className="card-gradient hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                  <Shield className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Admin Login</CardTitle>
                <CardDescription className="text-base">
                  HOD & Principal Access
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">
                  Access administrative dashboard and feedback reports
                </p>
                <Button 
                  onClick={() => navigate('/admin-login')}
                  variant="outline"
                  className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  size="lg"
                >
                  Login as Admin
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-success/10 rounded-full w-fit">
                <GraduationCap className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Anonymous Feedback</h3>
              <p className="text-muted-foreground text-sm">
                Share honest feedback without revealing your identity
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Access</h3>
              <p className="text-muted-foreground text-sm">
                Protected login system for authorized users only
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy to Use</h3>
              <p className="text-muted-foreground text-sm">
                Simple interface designed for quick feedback submission
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;