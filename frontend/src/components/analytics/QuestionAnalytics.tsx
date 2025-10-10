/**
 * Question analytics component for detailed question performance analysis
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target,
  AlertCircle,
  CheckCircle,
  Star,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionRating {
  rating: number;
  count: number;
  percentage: number;
}

interface QuestionAnalytics {
  question_id: string;
  question: string;
  category: string;
  weight: number;
  average_rating: number;
  total_responses: number;
  rating_distribution: QuestionRating[];
  trend: 'up' | 'down' | 'stable';
  previous_average?: number;
  improvement_suggestion: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  response_rate: number;
  standard_deviation: number;
  median_rating: number;
  mode_rating: number;
}

interface QuestionAnalyticsProps {
  questions: QuestionAnalytics[];
  onQuestionSelect?: (questionId: string) => void;
  selectedQuestion?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export function QuestionAnalytics({ 
  questions, 
  onQuestionSelect, 
  selectedQuestion,
  timeRange = 'month'
}: QuestionAnalyticsProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'responses' | 'trend' | 'difficulty'>('rating');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let filtered = questions;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'responses':
          return b.total_responses - a.total_responses;
        case 'trend':
          const aTrend = a.trend === 'up' ? 1 : a.trend === 'down' ? -1 : 0;
          const bTrend = b.trend === 'up' ? 1 : b.trend === 'down' ? -1 : 0;
          return bTrend - aTrend;
        case 'difficulty':
          const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
          return difficultyOrder[a.difficulty_level] - difficultyOrder[b.difficulty_level];
        default:
          return 0;
      }
    });
  }, [questions, sortBy, selectedCategory]);

  // Get categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(questions.map(q => q.category)));
    return ['all', ...cats];
  }, [questions]);

  // Get trend indicator
  const getTrendIndicator = (trend: string, current: number, previous?: number) => {
    if (trend === 'up') return { icon: TrendingUp, color: 'text-green-500', label: 'Improving' };
    if (trend === 'down') return { icon: TrendingDown, color: 'text-red-500', label: 'Declining' };
    return { icon: BarChart3, color: 'text-gray-500', label: 'Stable' };
  };

  // Get difficulty level styling
  const getDifficultyLevel = (level: string) => {
    switch (level) {
      case 'easy':
        return { color: 'bg-green-500', textColor: 'text-green-700', label: 'Easy' };
      case 'medium':
        return { color: 'bg-yellow-500', textColor: 'text-yellow-700', label: 'Medium' };
      case 'hard':
        return { color: 'bg-red-500', textColor: 'text-red-700', label: 'Hard' };
      default:
        return { color: 'bg-gray-500', textColor: 'text-gray-700', label: 'Unknown' };
    }
  };

  // Get performance level
  const getPerformanceLevel = (rating: number) => {
    if (rating >= 8.0) return { level: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' };
    if (rating >= 6.5) return { level: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (rating >= 5.0) return { level: 'Average', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Poor', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  // Prepare chart data
  const chartData = filteredQuestions.map(q => ({
    question: q.question.substring(0, 30) + '...',
    rating: q.average_rating,
    responses: q.total_responses,
    weight: q.weight,
    trend: q.trend === 'up' ? 1 : q.trend === 'down' ? -1 : 0
  }));

  // Prepare pie chart data for rating distribution
  const pieData = selectedQuestion ? 
    questions.find(q => q.question_id === selectedQuestion)?.rating_distribution.map(r => ({
      name: `${r.rating}/10`,
      value: r.count,
      percentage: r.percentage
    })) || [] : [];

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff6b6b', '#4ecdc4'];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Question Analytics</h3>
          <p className="text-muted-foreground">
            Detailed analysis of question performance and trends
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Category:</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Sort by:</span>
          <div className="flex space-x-1">
            {[
              { key: 'rating', label: 'Rating', icon: Star },
              { key: 'responses', label: 'Responses', icon: BarChart3 },
              { key: 'trend', label: 'Trend', icon: TrendingUp },
              { key: 'difficulty', label: 'Difficulty', icon: Target }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={sortBy === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(key as any)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => {
            const trend = getTrendIndicator(question.trend, question.average_rating, question.previous_average);
            const performance = getPerformanceLevel(question.average_rating);
            const difficulty = getDifficultyLevel(question.difficulty_level);
            const TrendIcon = trend.icon;
            
            return (
              <Card 
                key={question.question_id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedQuestion === question.question_id && "ring-2 ring-primary"
                )}
                onClick={() => onQuestionSelect?.(question.question_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-semibold">{question.question}</h4>
                        <Badge variant="outline" className="text-xs">
                          {question.category}
                        </Badge>
                        <Badge className={cn("text-xs", difficulty.textColor, difficulty.color)}>
                          {difficulty.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Average Rating</div>
                          <div className="text-2xl font-bold">{question.average_rating.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Responses</div>
                          <div className="text-2xl font-bold">{question.total_responses}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Response Rate</div>
                          <div className="text-2xl font-bold">{question.response_rate}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Weight</div>
                          <div className="text-2xl font-bold">{question.weight}%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <Badge className={cn("text-xs", performance.textColor, performance.color)}>
                          {performance.level}
                        </Badge>
                        <div className="flex items-center space-x-1 mt-2">
                          <TrendIcon className={cn("h-4 w-4", trend.color)} />
                          <span className="text-sm text-muted-foreground">{trend.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Rating Distribution</span>
                      <span>Std Dev: {question.standard_deviation.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      {question.rating_distribution.map((dist, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <span className="text-sm w-8">{dist.rating}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${dist.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm w-12">{dist.count}</span>
                          <span className="text-sm w-12 text-muted-foreground">({dist.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium">Improvement Suggestion</h5>
                        <p className="text-sm text-muted-foreground">{question.improvement_suggestion}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Tab */}
      {viewMode === 'detailed' && selectedQuestion && (
        <div className="space-y-4">
          {(() => {
            const question = questions.find(q => q.question_id === selectedQuestion);
            if (!question) return <div>Question not found</div>;
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle>{question.question}</CardTitle>
                  <CardDescription>
                    {question.category} • Weight: {question.weight}% • Difficulty: {question.difficulty_level}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{question.average_rating.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Average Rating</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{question.total_responses}</div>
                      <div className="text-sm text-muted-foreground">Total Responses</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{question.median_rating.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Median Rating</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{question.mode_rating}</div>
                      <div className="text-sm text-muted-foreground">Mode Rating</div>
                    </div>
                  </div>

                  {/* Rating Distribution Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Rating Distribution</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={question.rating_distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Response Distribution</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Comparison Tab */}
      {viewMode === 'comparison' && (
        <Card>
          <CardHeader>
            <CardTitle>Question Performance Comparison</CardTitle>
            <CardDescription>
              Compare question performance across different metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="question" angle={-45} textAnchor="end" height={100} />
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
    </div>
  );
}
