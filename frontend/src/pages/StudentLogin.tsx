import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, GraduationCap, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface BatchYear {
  id: string;
  year_range: string;
  department: string;
  sections: string[];
}

const StudentLogin = () => {
  const navigate = useNavigate();
  const { loginStudent } = useAuth();
  const [department, setDepartment] = useState<string>('');
  const [batchYear, setBatchYear] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [regNumber, setRegNumber] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batchYears, setBatchYears] = useState<BatchYear[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load departments and batch years on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        
        // Load departments
        const deptResponse = await apiService.getPublicDepartments();
        if (deptResponse.success && deptResponse.data?.departments) {
          setDepartments(deptResponse.data.departments);
        }
        
        // Load batch years
        const batchResponse = await apiService.getPublicBatchYears();
        if (batchResponse.success && batchResponse.data?.batch_years) {
          setBatchYears(batchResponse.data.batch_years);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load department and batch year data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Update batch years when department changes
  useEffect(() => {
    if (department) {
      const filteredBatchYears = batchYears.filter(batch => 
        batch.department.toUpperCase() === department.toUpperCase()
      );
      setBatchYears(filteredBatchYears);
      setBatchYear(''); // Reset batch year selection
      setSection(''); // Reset section selection
      setAvailableSections([]); // Clear available sections
    }
  }, [department]);

  // Update available sections when batch year changes
  useEffect(() => {
    if (batchYear) {
      const selectedBatch = batchYears.find(batch => batch.id === batchYear);
      if (selectedBatch) {
        setAvailableSections(selectedBatch.sections);
        setSection(''); // Reset section selection
      }
    }
  }, [batchYear, batchYears]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!department || !batchYear || !section || !regNumber || !dob) {
      setError('Please fill in all fields: department, batch year, section, registration number and date of birth');
      setIsLoading(false);
      return;
    }

    // Basic validation - let backend handle detailed format validation
    if (regNumber.length < 5 || regNumber.length > 20) {
      setError('Registration number must be between 5 and 20 characters');
      setIsLoading(false);
      return;
    }

    try {
      await loginStudent(regNumber, dob);
      navigate('/feedback');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Login Card */}
        <Card className="card-academic">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>
              Enter your department, batch year, section and registration number to access the feedback form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Department Selection */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment} disabled={isLoadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.code}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Year Selection */}
              <div className="space-y-2">
                <Label htmlFor="batchYear">Batch Year</Label>
                <Select value={batchYear} onValueChange={setBatchYear} disabled={!department || isLoadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your batch year" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchYears.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.year_range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Selection */}
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select value={section} onValueChange={setSection} disabled={!batchYear || isLoadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((sectionCode) => (
                      <SelectItem key={sectionCode} value={sectionCode}>
                        Section {sectionCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Registration Number */}
              <div className="space-y-2">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input
                  id="regNumber"
                  type="text"
                  placeholder="24G31A05XX"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your registration number (5-20 characters, letters and numbers only)
                </p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your date of birth as password
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full btn-academic"
                disabled={isLoading || isLoadingData}
              >
                {isLoading ? 'Logging in...' : isLoadingData ? 'Loading...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Instructions:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>1. Select your department (e.g., Computer Science and Engineering)</p>
                <p>2. Choose your batch year (e.g., 2024-2028)</p>
                <p>3. Select your section (e.g., Section A)</p>
                <p>4. Enter your registration number</p>
                <p>5. Enter your date of birth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;