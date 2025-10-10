import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { apiService } from "@/services/api";
import { toast } from "sonner";

interface ReportGeneratorProps {
  userRole: 'hod' | 'principal';
  userDepartment?: string;
  onReportGenerated?: () => void;
}

const ReportGenerator = ({ userRole, userDepartment, onReportGenerated }: ReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [selectedSection, setSelectedSection] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [selectedBatchYear, setSelectedBatchYear] = useState('2024-2028');

  const handleGenerateReport = async () => {
    if (!selectedFormat || !selectedSection || !selectedBatchYear) {
      toast.error('Please select all required fields');
      return;
    }

    setIsGenerating(true);
    try {
      const reportData = await apiService.generateReport({
        department: userDepartment || 'CSE',
        batch_year: selectedBatchYear,
        section: selectedSection,
        format: selectedFormat
      });

      if (reportData.success && reportData.data?.file_content) {
        // Convert base64 to blob and download
        const binaryString = atob(reportData.data.file_content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { 
          type: reportData.data.content_type || 'application/octet-stream' 
        });
        
        const filename = `${reportData.data.report_name}.${reportData.data.file_extension}`;
        apiService.downloadFileFromBlob(blob, filename);
        
        toast.success('Report generated and downloaded successfully');
        onReportGenerated?.();
      } else {
        throw new Error(reportData.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <File className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Generate Feedback Report
        </CardTitle>
        <CardDescription>
          Generate comprehensive feedback reports for faculty and students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Report Format</Label>
            <Select value={selectedFormat} onValueChange={(value: 'csv' | 'pdf' | 'excel') => setSelectedFormat(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('csv')}
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('excel')}
                    Excel
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    {getFormatIcon('pdf')}
                    PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Select value={selectedSection} onValueChange={(value: 'A' | 'B' | 'C' | 'D') => setSelectedSection(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
                <SelectItem value="D">Section D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-year">Batch Year</Label>
            <Select value={selectedBatchYear} onValueChange={setSelectedBatchYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-2028">2024-2028</SelectItem>
                <SelectItem value="2023-2027">2023-2027</SelectItem>
                <SelectItem value="2022-2026">2022-2026</SelectItem>
                <SelectItem value="2021-2025">2021-2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              'Generating Report...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Reports include comprehensive feedback analysis and statistics</p>
          <p>• Data is filtered by department: {userDepartment || 'CSE'}</p>
          <p>• Generated reports are automatically downloaded</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;