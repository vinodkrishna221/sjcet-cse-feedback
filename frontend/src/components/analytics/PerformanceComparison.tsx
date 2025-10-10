/**
 * Performance comparison component for faculty analytics
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target,
  Award,
  Users,
  Star,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FacultyPerformance {
  faculty_id: string;
  faculty_name: string;
  subject: string;
  department: string;
  average_rating: number;
  response_count: number;
  previous_rating?: number;
  question_ratings: Array<{
    question_id: string;
    question: string;
    average_rating: number;
    weight: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  rank: number;
  percentile: number;
}

interface PerformanceComparisonProps {
  facultyData: FacultyPerformance[];
  comparisonType: 'department' | 'subject' | 'overall';
  onFacultySelect?: (facultyId: string) => void;
  selectedFaculty?: string;
}

export function PerformanceComparison({ 
  facultyData, 
  comparisonType, 
  onFacultySelect,
  selectedFaculty 
}: PerformanceComparisonProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'responses' | 'trend'>('rating');
  const [viewMode, setViewMode] = useState<'list' | 'chart' | 'radar'>('list');

  // Sort and filter data
  const sortedData = useMemo(() => {
    return [...facultyData].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'responses':
          return b.response_count - a.response_count;
        case 'trend':
          const aTrend = a.trend === 'up' ? 1 : a.trend === 'down' ? -1 : 0;
          const bTrend = b.trend === 'up' ? 1 : b.trend === 'down' ? -1 : 0;
          return bTrend - aTrend;
        default:
          return 0;
      }
    });
  }, [facultyData, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const ratings = facultyData.map(f => f.average_rating);
    const responses = facultyData.map(f => f.response_count);
    
    return {
      averageRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      totalResponses: responses.reduce((a, b) => a + b, 0),
      highestRating: Math.max(...ratings),
      lowestRating: Math.min(...ratings),
      medianRating: ratings.sort((a, b) => a - b)[Math.floor(ratings.length / 2)],
      standardDeviation: Math.sqrt(
        ratings.reduce((acc, rating) => acc + Math.pow(rating - stats.averageRating, 2), 0) / ratings.length
      )
    };
  }, [facultyData]);

  // Get trend indicator
  const getTrendIndicator = (trend: string, current: number, previous?: number) => {
    if (trend === 'up') return { icon: TrendingUp, color: 'text-green-500', label: 'Improving' };
    if (trend === 'down') return { icon: TrendingDown, color: 'text-red-500', label: 'Declining' };
    return { icon: BarChart3, color: 'text-gray-500', label: 'Stable' };
  };

  // Get performance level
  const getPerformanceLevel = (rating: number) => {
    if (rating >= 8.5) return { level: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' };
    if (rating >= 7.0) return { level: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (rating >= 5.5) return { level: 'Average', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Needs Improvement', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  // Prepare chart data
  const chartData = sortedData.map(faculty => ({
    name: faculty.faculty_name.split(' ')[0], // First name only for chart
    rating: faculty.average_rating,
    responses: faculty.response_count,
    trend: faculty.trend === 'up' ? 1 : faculty.trend === 'down' ? -1 : 0
  }));

  // Prepare radar chart data
  const radarData = selectedFaculty ? 
    facultyData.find(f => f.faculty_id === selectedFaculty)?.question_ratings.map(q => ({
      subject: q.question.substring(0, 20) + '...',
      A: q.average_rating,
      fullMark: 10
    })) || [] : [];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Performance Comparison</h3>
          <p className="text-muted-foreground">
            Compare faculty performance across {comparisonType}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="radar">Radar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Range: {stats.lowestRating.toFixed(1)} - {stats.highestRating.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResponses}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {Math.round(stats.totalResponses / facultyData.length)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Median Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.medianRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Std Dev: {stats.standardDeviation.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facultyData.filter(f => f.average_rating >= 8.0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Rating ≥ 8.0
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium">Sort by:</span>
        <div className="flex space-x-2">
          {[
            { key: 'rating', label: 'Rating', icon: Star },
            { key: 'responses', label: 'Responses', icon: Users },
            { key: 'trend', label: 'Trend', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={sortBy === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy(key as any)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {sortedData.map((faculty, index) => {
            const trend = getTrendIndicator(faculty.trend, faculty.average_rating, faculty.previous_rating);
            const performance = getPerformanceLevel(faculty.average_rating);
            const TrendIcon = trend.icon;
            
            return (
              <Card 
                key={faculty.faculty_id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedFaculty === faculty.faculty_id && "ring-2 ring-primary"
                )}
                onClick={() => onFacultySelect?.(faculty.faculty_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-full text-lg font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">{faculty.faculty_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {faculty.subject} • {faculty.department}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{faculty.average_rating.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">Rating</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold">{faculty.response_count}</div>
                        <div className="text-sm text-muted-foreground">Responses</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold">{faculty.percentile}%</div>
                        <div className="text-sm text-muted-foreground">Percentile</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", performance.textColor, performance.color)}>
                          {performance.level}
                        </Badge>
                        <TrendIcon className={cn("h-5 w-5", trend.color)} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Performance Level</span>
                      <span>{faculty.average_rating.toFixed(1)}/10</span>
                    </div>
                    <Progress value={faculty.average_rating * 10} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'chart' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison Chart</CardTitle>
            <CardDescription>
              Faculty ratings and response counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="rating" orientation="left" domain={[0, 10]} />
                <YAxis yAxisId="responses" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar 
                  yAxisId="rating"
                  dataKey="rating" 
                  fill="#8884d8" 
                  name="Average Rating"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  yAxisId="responses"
                  dataKey="responses" 
                  fill="#82ca9d" 
                  name="Response Count"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {viewMode === 'radar' && selectedFaculty && (
        <Card>
          <CardHeader>
            <CardTitle>Question Performance Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown for selected faculty
            </CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar
                    name="Rating"
                    dataKey="A"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a faculty member to view detailed analysis
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
