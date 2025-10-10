/**
 * Trend dashboard component for feedback analytics
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TrendData {
  period: string;
  average_rating: number;
  response_count: number;
  completion_rate: number;
  faculty_count: number;
}

interface QuestionAnalytics {
  question_id: string;
  question: string;
  average_rating: number;
  rating_distribution: Array<{ rating: number; count: number }>;
  trend: 'up' | 'down' | 'stable';
  improvement_suggestion: string;
}

interface FacultyPerformance {
  faculty_id: string;
  faculty_name: string;
  subject: string;
  average_rating: number;
  response_count: number;
  trend: 'up' | 'down' | 'stable';
  rank: number;
  previous_rating?: number;
}

interface TrendDashboardProps {
  data: {
    trends: TrendData[];
    question_analytics: QuestionAnalytics[];
    faculty_performance: FacultyPerformance[];
    overall_stats: {
      total_responses: number;
      average_rating: number;
      completion_rate: number;
      participation_rate: number;
    };
  };
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  isLoading?: boolean;
}

export function TrendDashboard({ 
  data, 
  onRefresh, 
  onExport, 
  isLoading = false 
}: TrendDashboardProps) {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Filter data based on selections
  const filteredTrends = data.trends.filter(trend => {
    // Add filtering logic based on selectedPeriod
    return true;
  });

  const filteredFacultyPerformance = data.faculty_performance.filter(faculty => {
    if (selectedFaculty !== 'all' && faculty.faculty_id !== selectedFaculty) return false;
    if (selectedSubject !== 'all' && faculty.subject !== selectedSubject) return false;
    return true;
  });

  // Calculate trend indicators
  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) return { icon: TrendingUp, color: 'text-green-500', label: 'Up' };
    if (current < previous) return { icon: TrendingDown, color: 'text-red-500', label: 'Down' };
    return { icon: BarChart3, color: 'text-gray-500', label: 'Stable' };
  };

  // Color palette for charts
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into feedback trends and performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => onExport?.('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall_stats.total_responses}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall_stats.average_rating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              +0.3 from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall_stats.completion_rate}%</div>
            <Progress value={data.overall_stats.completion_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall_stats.participation_rate}%</div>
            <p className="text-xs text-muted-foreground">
              +5% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rating Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Trends Over Time</CardTitle>
                <CardDescription>
                  Average ratings by period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="average_rating" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Average Rating"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Count Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Response Count Trends</CardTitle>
                <CardDescription>
                  Number of responses by period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="response_count" fill="#82ca9d" name="Response Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Faculty Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Faculty</CardTitle>
              <CardDescription>
                Faculty ranked by average rating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFacultyPerformance.slice(0, 5).map((faculty, index) => {
                  const TrendIcon = getTrendIndicator(faculty.average_rating, faculty.previous_rating || 0).icon;
                  return (
                    <div key={faculty.faculty_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{faculty.faculty_name}</h4>
                          <p className="text-sm text-muted-foreground">{faculty.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-lg font-bold">{faculty.average_rating.toFixed(1)}</div>
                          <div className="text-sm text-muted-foreground">{faculty.response_count} responses</div>
                        </div>
                        <TrendIcon className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Trend Analysis</CardTitle>
              <CardDescription>
                Comprehensive view of feedback trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={filteredTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="average_rating" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8"
                    name="Average Rating"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completion_rate" 
                    stackId="2" 
                    stroke="#82ca9d" 
                    fill="#82ca9d"
                    name="Completion Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.question_analytics.map((question, index) => (
              <Card key={question.question_id}>
                <CardHeader>
                  <CardTitle className="text-sm">{question.question}</CardTitle>
                  <CardDescription>
                    Average Rating: {question.average_rating.toFixed(1)}/10
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Rating Distribution */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Rating Distribution</h4>
                      <div className="space-y-2">
                        {question.rating_distribution.map((dist, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <span className="text-sm w-8">{dist.rating}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${(dist.count / Math.max(...question.rating_distribution.map(d => d.count))) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm w-8">{dist.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Improvement Suggestion */}
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-1">Improvement Suggestion</h4>
                      <p className="text-sm text-muted-foreground">{question.improvement_suggestion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Faculty Tab */}
        <TabsContent value="faculty" className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Faculty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Faculty</SelectItem>
                {data.faculty_performance.map(faculty => (
                  <SelectItem key={faculty.faculty_id} value={faculty.faculty_id}>
                    {faculty.faculty_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {Array.from(new Set(data.faculty_performance.map(f => f.subject))).map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredFacultyPerformance.map((faculty, index) => {
              const trend = getTrendIndicator(faculty.average_rating, faculty.previous_rating || 0);
              const TrendIcon = trend.icon;
              
              return (
                <Card key={faculty.faculty_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{faculty.faculty_name}</CardTitle>
                        <CardDescription>{faculty.subject}</CardDescription>
                      </div>
                      <Badge variant={faculty.rank <= 3 ? 'default' : 'secondary'}>
                        Rank #{faculty.rank}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Average Rating</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold">{faculty.average_rating.toFixed(1)}</span>
                          <TrendIcon className={cn("h-5 w-5", trend.color)} />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Response Count</span>
                        <span className="text-lg font-semibold">{faculty.response_count}</span>
                      </div>

                      <Progress value={faculty.average_rating * 10} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
