"""
Report template system for customizable report generation
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class TemplateType(Enum):
    FACULTY_ANALYTICS = "faculty_analytics"
    STUDENT_FEEDBACK = "student_feedback"
    DEPARTMENT_SUMMARY = "department_summary"
    TREND_ANALYSIS = "trend_analysis"
    CUSTOM = "custom"

class SectionType(Enum):
    HEADER = "header"
    SUMMARY = "summary"
    CHART = "chart"
    TABLE = "table"
    TEXT = "text"
    IMAGE = "image"
    COMPARISON = "comparison"
    RECOMMENDATIONS = "recommendations"

@dataclass
class ChartConfig:
    id: str
    title: str
    chart_type: str  # bar, line, pie, scatter, heatmap
    data_source: str
    x_axis: str
    y_axis: str
    colors: List[str]
    width: int = 600
    height: int = 400
    show_legend: bool = True
    show_grid: bool = True

@dataclass
class TableConfig:
    id: str
    title: str
    data_source: str
    columns: List[Dict[str, Any]]
    show_header: bool = True
    show_borders: bool = True
    alternate_rows: bool = True
    sortable: bool = True

@dataclass
class SectionConfig:
    id: str
    type: SectionType
    title: str
    content: str
    order: int
    visible: bool = True
    chart_config: Optional[ChartConfig] = None
    table_config: Optional[TableConfig] = None
    styling: Dict[str, Any] = None

@dataclass
class ReportTemplate:
    id: str
    name: str
    description: str
    type: TemplateType
    version: str
    created_at: datetime
    updated_at: datetime
    created_by: str
    is_public: bool = False
    is_active: bool = True
    sections: List[SectionConfig]
    default_format: str = "pdf"
    styling: Dict[str, Any] = None
    metadata: Dict[str, Any] = None

class ReportTemplateManager:
    """Manager for report templates"""
    
    def __init__(self):
        self.templates = {}
        self._load_default_templates()
    
    def _load_default_templates(self):
        """Load default report templates"""
        default_templates = [
            self._create_faculty_analytics_template(),
            self._create_student_feedback_template(),
            self._create_department_summary_template(),
            self._create_trend_analysis_template()
        ]
        
        for template in default_templates:
            self.templates[template.id] = template
    
    def _create_faculty_analytics_template(self) -> ReportTemplate:
        """Create faculty analytics template"""
        return ReportTemplate(
            id="faculty_analytics_v1",
            name="Faculty Analytics Report",
            description="Comprehensive faculty performance analysis with charts and recommendations",
            type=TemplateType.FACULTY_ANALYTICS,
            version="1.0",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            sections=[
                SectionConfig(
                    id="header",
                    type=SectionType.HEADER,
                    title="Faculty Performance Analytics",
                    content="Comprehensive analysis of faculty performance based on student feedback",
                    order=1,
                    styling={"font_size": 24, "color": "#2563eb", "alignment": "center"}
                ),
                SectionConfig(
                    id="executive_summary",
                    type=SectionType.SUMMARY,
                    title="Executive Summary",
                    content="Key insights and performance metrics",
                    order=2,
                    styling={"font_size": 16, "color": "#1f2937", "margin_bottom": 20}
                ),
                SectionConfig(
                    id="performance_chart",
                    type=SectionType.CHART,
                    title="Faculty Performance Overview",
                    content="Bar chart showing faculty ratings",
                    order=3,
                    chart_config=ChartConfig(
                        id="faculty_ratings",
                        title="Faculty Ratings by Department",
                        chart_type="bar",
                        data_source="faculty_ratings",
                        x_axis="faculty_name",
                        y_axis="average_rating",
                        colors=["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
                    )
                ),
                SectionConfig(
                    id="department_distribution",
                    type=SectionType.CHART,
                    title="Department Distribution",
                    content="Pie chart showing faculty distribution by department",
                    order=4,
                    chart_config=ChartConfig(
                        id="department_pie",
                        title="Faculty Distribution by Department",
                        chart_type="pie",
                        data_source="department_distribution",
                        x_axis="department",
                        y_axis="count",
                        colors=["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
                    )
                ),
                SectionConfig(
                    id="detailed_table",
                    type=SectionType.TABLE,
                    title="Detailed Faculty Data",
                    content="Comprehensive table with faculty performance metrics",
                    order=5,
                    table_config=TableConfig(
                        id="faculty_table",
                        title="Faculty Performance Metrics",
                        data_source="faculty_data",
                        columns=[
                            {"key": "faculty_name", "title": "Faculty Name", "width": 150},
                            {"key": "department", "title": "Department", "width": 120},
                            {"key": "average_rating", "title": "Avg Rating", "width": 100, "format": "decimal"},
                            {"key": "total_responses", "title": "Responses", "width": 100, "format": "number"},
                            {"key": "improvement_trend", "title": "Trend", "width": 100, "format": "text"}
                        ]
                    )
                ),
                SectionConfig(
                    id="recommendations",
                    type=SectionType.RECOMMENDATIONS,
                    title="Recommendations",
                    content="Actionable recommendations based on the analysis",
                    order=6,
                    styling={"font_size": 14, "color": "#374151", "margin_top": 20}
                )
            ],
            default_format="pdf",
            styling={
                "primary_color": "#2563eb",
                "secondary_color": "#64748b",
                "accent_color": "#f59e0b",
                "font_family": "Helvetica",
                "font_size": 12,
                "line_height": 1.5,
                "margin": {"top": 72, "right": 72, "bottom": 72, "left": 72}
            },
            metadata={
                "category": "analytics",
                "tags": ["faculty", "performance", "analytics"],
                "complexity": "intermediate",
                "estimated_time": "5-10 minutes"
            }
        )
    
    def _create_student_feedback_template(self) -> ReportTemplate:
        """Create student feedback template"""
        return ReportTemplate(
            id="student_feedback_v1",
            name="Student Feedback Report",
            description="Student feedback analysis with insights and trends",
            type=TemplateType.STUDENT_FEEDBACK,
            version="1.0",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            sections=[
                SectionConfig(
                    id="header",
                    type=SectionType.HEADER,
                    title="Student Feedback Analysis",
                    content="Comprehensive analysis of student feedback data",
                    order=1,
                    styling={"font_size": 24, "color": "#059669", "alignment": "center"}
                ),
                SectionConfig(
                    id="feedback_summary",
                    type=SectionType.SUMMARY,
                    title="Feedback Summary",
                    content="Overview of feedback collection and response rates",
                    order=2,
                    styling={"font_size": 16, "color": "#1f2937", "margin_bottom": 20}
                ),
                SectionConfig(
                    id="question_ratings",
                    type=SectionType.CHART,
                    title="Question Rating Distribution",
                    content="Bar chart showing average ratings for each question",
                    order=3,
                    chart_config=ChartConfig(
                        id="question_ratings",
                        title="Average Ratings by Question",
                        chart_type="bar",
                        data_source="question_ratings",
                        x_axis="question",
                        y_axis="average_rating",
                        colors=["#059669", "#0d9488", "#14b8a6", "#5eead4", "#99f6e4"]
                    )
                ),
                SectionConfig(
                    id="response_distribution",
                    type=SectionType.CHART,
                    title="Response Distribution",
                    content="Pie chart showing distribution of responses",
                    order=4,
                    chart_config=ChartConfig(
                        id="response_pie",
                        title="Response Distribution by Section",
                        chart_type="pie",
                        data_source="response_distribution",
                        x_axis="section",
                        y_axis="count",
                        colors=["#059669", "#0d9488", "#14b8a6", "#5eead4", "#99f6e4"]
                    )
                ),
                SectionConfig(
                    id="feedback_table",
                    type=SectionType.TABLE,
                    title="Detailed Feedback Data",
                    content="Comprehensive table with feedback metrics",
                    order=5,
                    table_config=TableConfig(
                        id="feedback_table",
                        title="Feedback Metrics by Faculty",
                        data_source="feedback_data",
                        columns=[
                            {"key": "faculty_name", "title": "Faculty", "width": 150},
                            {"key": "subject", "title": "Subject", "width": 120},
                            {"key": "average_rating", "title": "Avg Rating", "width": 100, "format": "decimal"},
                            {"key": "response_count", "title": "Responses", "width": 100, "format": "number"},
                            {"key": "improvement_area", "title": "Improvement Area", "width": 150, "format": "text"}
                        ]
                    )
                ),
                SectionConfig(
                    id="insights",
                    type=SectionType.TEXT,
                    title="Key Insights",
                    content="Important insights and patterns identified in the feedback data",
                    order=6,
                    styling={"font_size": 14, "color": "#374151", "margin_top": 20}
                )
            ],
            default_format="pdf",
            styling={
                "primary_color": "#059669",
                "secondary_color": "#6b7280",
                "accent_color": "#dc2626",
                "font_family": "Helvetica",
                "font_size": 12,
                "line_height": 1.5,
                "margin": {"top": 72, "right": 72, "bottom": 72, "left": 72}
            },
            metadata={
                "category": "feedback",
                "tags": ["student", "feedback", "analysis"],
                "complexity": "beginner",
                "estimated_time": "3-5 minutes"
            }
        )
    
    def _create_department_summary_template(self) -> ReportTemplate:
        """Create department summary template"""
        return ReportTemplate(
            id="department_summary_v1",
            name="Department Summary Report",
            description="Department-wide performance summary with comparisons",
            type=TemplateType.DEPARTMENT_SUMMARY,
            version="1.0",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            sections=[
                SectionConfig(
                    id="header",
                    type=SectionType.HEADER,
                    title="Department Performance Summary",
                    content="Comprehensive department performance analysis",
                    order=1,
                    styling={"font_size": 24, "color": "#7c3aed", "alignment": "center"}
                ),
                SectionConfig(
                    id="department_overview",
                    type=SectionType.SUMMARY,
                    title="Department Overview",
                    content="High-level department performance metrics",
                    order=2,
                    styling={"font_size": 16, "color": "#1f2937", "margin_bottom": 20}
                ),
                SectionConfig(
                    id="department_ratings",
                    type=SectionType.CHART,
                    title="Department Performance Comparison",
                    content="Bar chart comparing department ratings",
                    order=3,
                    chart_config=ChartConfig(
                        id="department_ratings",
                        title="Average Ratings by Department",
                        chart_type="bar",
                        data_source="department_ratings",
                        x_axis="department",
                        y_axis="average_rating",
                        colors=["#7c3aed", "#a855f7", "#c084fc", "#ddd6fe", "#f3e8ff"]
                    )
                ),
                SectionConfig(
                    id="performance_heatmap",
                    type=SectionType.CHART,
                    title="Performance Heatmap",
                    content="Heatmap showing performance across different metrics",
                    order=4,
                    chart_config=ChartConfig(
                        id="performance_heatmap",
                        title="Performance Heatmap by Department and Metric",
                        chart_type="heatmap",
                        data_source="performance_matrix",
                        x_axis="metric",
                        y_axis="department",
                        colors=["#7c3aed", "#a855f7", "#c084fc", "#ddd6fe", "#f3e8ff"]
                    )
                ),
                SectionConfig(
                    id="department_table",
                    type=SectionType.TABLE,
                    title="Department Performance Data",
                    content="Detailed department performance metrics",
                    order=5,
                    table_config=TableConfig(
                        id="department_table",
                        title="Department Performance Metrics",
                        data_source="department_data",
                        columns=[
                            {"key": "department", "title": "Department", "width": 150},
                            {"key": "faculty_count", "title": "Faculty Count", "width": 120, "format": "number"},
                            {"key": "average_rating", "title": "Avg Rating", "width": 100, "format": "decimal"},
                            {"key": "total_responses", "title": "Total Responses", "width": 120, "format": "number"},
                            {"key": "improvement_score", "title": "Improvement Score", "width": 130, "format": "decimal"}
                        ]
                    )
                ),
                SectionConfig(
                    id="cross_department_comparison",
                    type=SectionType.COMPARISON,
                    title="Cross-Department Comparison",
                    content="Comparative analysis across departments",
                    order=6,
                    styling={"font_size": 14, "color": "#374151", "margin_top": 20}
                )
            ],
            default_format="pdf",
            styling={
                "primary_color": "#7c3aed",
                "secondary_color": "#9ca3af",
                "accent_color": "#f97316",
                "font_family": "Helvetica",
                "font_size": 12,
                "line_height": 1.5,
                "margin": {"top": 72, "right": 72, "bottom": 72, "left": 72}
            },
            metadata={
                "category": "summary",
                "tags": ["department", "performance", "comparison"],
                "complexity": "advanced",
                "estimated_time": "10-15 minutes"
            }
        )
    
    def _create_trend_analysis_template(self) -> ReportTemplate:
        """Create trend analysis template"""
        return ReportTemplate(
            id="trend_analysis_v1",
            name="Trend Analysis Report",
            description="Historical trend analysis with forecasting",
            type=TemplateType.TREND_ANALYSIS,
            version="1.0",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            sections=[
                SectionConfig(
                    id="header",
                    type=SectionType.HEADER,
                    title="Trend Analysis Report",
                    content="Historical performance trends and forecasting",
                    order=1,
                    styling={"font_size": 24, "color": "#dc2626", "alignment": "center"}
                ),
                SectionConfig(
                    id="trend_summary",
                    type=SectionType.SUMMARY,
                    title="Trend Summary",
                    content="Overview of performance trends over time",
                    order=2,
                    styling={"font_size": 16, "color": "#1f2937", "margin_bottom": 20}
                ),
                SectionConfig(
                    id="trend_chart",
                    type=SectionType.CHART,
                    title="Performance Trends",
                    content="Line chart showing performance trends over time",
                    order=3,
                    chart_config=ChartConfig(
                        id="trend_line",
                        title="Performance Trends Over Time",
                        chart_type="line",
                        data_source="trend_data",
                        x_axis="period",
                        y_axis="rating",
                        colors=["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d"]
                    )
                ),
                SectionConfig(
                    id="forecast_chart",
                    type=SectionType.CHART,
                    title="Performance Forecast",
                    content="Forecasted performance based on historical data",
                    order=4,
                    chart_config=ChartConfig(
                        id="forecast_line",
                        title="Performance Forecast",
                        chart_type="line",
                        data_source="forecast_data",
                        x_axis="period",
                        y_axis="predicted_rating",
                        colors=["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d"]
                    )
                ),
                SectionConfig(
                    id="trend_table",
                    type=SectionType.TABLE,
                    title="Trend Data",
                    content="Detailed trend data and statistics",
                    order=5,
                    table_config=TableConfig(
                        id="trend_table",
                        title="Trend Analysis Data",
                        data_source="trend_data",
                        columns=[
                            {"key": "period", "title": "Period", "width": 120},
                            {"key": "rating", "title": "Rating", "width": 100, "format": "decimal"},
                            {"key": "change", "title": "Change", "width": 100, "format": "decimal"},
                            {"key": "trend", "title": "Trend", "width": 100, "format": "text"},
                            {"key": "confidence", "title": "Confidence", "width": 120, "format": "percentage"}
                        ]
                    )
                ),
                SectionConfig(
                    id="insights",
                    type=SectionType.TEXT,
                    title="Trend Insights",
                    content="Key insights from trend analysis",
                    order=6,
                    styling={"font_size": 14, "color": "#374151", "margin_top": 20}
                )
            ],
            default_format="pdf",
            styling={
                "primary_color": "#dc2626",
                "secondary_color": "#6b7280",
                "accent_color": "#059669",
                "font_family": "Helvetica",
                "font_size": 12,
                "line_height": 1.5,
                "margin": {"top": 72, "right": 72, "bottom": 72, "left": 72}
            },
            metadata={
                "category": "trends",
                "tags": ["trends", "analysis", "forecasting"],
                "complexity": "advanced",
                "estimated_time": "15-20 minutes"
            }
        )
    
    def get_template(self, template_id: str) -> Optional[ReportTemplate]:
        """Get a template by ID"""
        return self.templates.get(template_id)
    
    def list_templates(
        self,
        template_type: Optional[TemplateType] = None,
        is_public: Optional[bool] = None,
        is_active: Optional[bool] = None
    ) -> List[ReportTemplate]:
        """List templates with filters"""
        templates = list(self.templates.values())
        
        if template_type:
            templates = [t for t in templates if t.type == template_type]
        
        if is_public is not None:
            templates = [t for t in templates if t.is_public == is_public]
        
        if is_active is not None:
            templates = [t for t in templates if t.is_active == is_active]
        
        return sorted(templates, key=lambda x: x.name)
    
    def create_template(self, template: ReportTemplate) -> bool:
        """Create a new template"""
        try:
            if template.id in self.templates:
                return False  # Template already exists
            
            self.templates[template.id] = template
            logger.info(f"Template created: {template.id}")
            return True
            
        except Exception as e:
            logger.error(f"Template creation error: {e}")
            return False
    
    def update_template(self, template_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing template"""
        try:
            if template_id not in self.templates:
                return False
            
            template = self.templates[template_id]
            
            # Update fields
            for key, value in updates.items():
                if hasattr(template, key):
                    setattr(template, key, value)
            
            template.updated_at = datetime.utcnow()
            
            logger.info(f"Template updated: {template_id}")
            return True
            
        except Exception as e:
            logger.error(f"Template update error: {e}")
            return False
    
    def delete_template(self, template_id: str) -> bool:
        """Delete a template"""
        try:
            if template_id not in self.templates:
                return False
            
            del self.templates[template_id]
            logger.info(f"Template deleted: {template_id}")
            return True
            
        except Exception as e:
            logger.error(f"Template deletion error: {e}")
            return False
    
    def clone_template(self, template_id: str, new_id: str, new_name: str) -> Optional[ReportTemplate]:
        """Clone an existing template"""
        try:
            original = self.templates.get(template_id)
            if not original:
                return None
            
            # Create clone
            clone = ReportTemplate(
                id=new_id,
                name=new_name,
                description=original.description,
                type=original.type,
                version="1.0",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by="user",  # This would be set by the actual user
                is_public=False,
                sections=original.sections.copy(),
                default_format=original.default_format,
                styling=original.styling.copy() if original.styling else None,
                metadata=original.metadata.copy() if original.metadata else None
            )
            
            self.templates[new_id] = clone
            logger.info(f"Template cloned: {template_id} -> {new_id}")
            return clone
            
        except Exception as e:
            logger.error(f"Template cloning error: {e}")
            return None
