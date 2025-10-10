"""
Subscription system for automated reports
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import json
import redis
import uuid

logger = logging.getLogger(__name__)

class SubscriptionStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class SubscriptionType(Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

@dataclass
class SubscriptionPlan:
    id: str
    name: str
    type: SubscriptionType
    description: str
    price: float
    currency: str = "USD"
    billing_cycle: str = "monthly"  # monthly, quarterly, yearly
    features: List[str] = None
    limits: Dict[str, int] = None
    is_active: bool = True
    created_at: datetime = None

@dataclass
class UserSubscription:
    id: str
    user_id: str
    plan_id: str
    status: SubscriptionStatus
    start_date: datetime
    end_date: Optional[datetime] = None
    auto_renew: bool = True
    payment_method: str = ""
    billing_address: Dict[str, str] = None
    created_at: datetime = None
    updated_at: datetime = None
    cancelled_at: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None

@dataclass
class ReportSubscription:
    id: str
    user_id: str
    schedule_id: str
    subscription_id: str
    is_active: bool = True
    created_at: datetime = None
    updated_at: datetime = None

class SubscriptionManager:
    """Manager for subscription system"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        self.plans = {}
        self._load_default_plans()
    
    def _load_default_plans(self):
        """Load default subscription plans"""
        default_plans = [
            SubscriptionPlan(
                id="free",
                name="Free Plan",
                type=SubscriptionType.FREE,
                description="Basic features for individual users",
                price=0.0,
                features=[
                    "Basic report generation",
                    "PDF format only",
                    "5 reports per month",
                    "Email notifications",
                    "Basic analytics"
                ],
                limits={
                    "reports_per_month": 5,
                    "storage_gb": 1,
                    "users": 1,
                    "scheduled_reports": 2
                }
            ),
            SubscriptionPlan(
                id="basic",
                name="Basic Plan",
                type=SubscriptionType.BASIC,
                description="Enhanced features for small teams",
                price=29.99,
                features=[
                    "All Free features",
                    "Multiple report formats (PDF, Excel, CSV)",
                    "50 reports per month",
                    "Advanced analytics",
                    "Custom templates",
                    "Priority support"
                ],
                limits={
                    "reports_per_month": 50,
                    "storage_gb": 10,
                    "users": 5,
                    "scheduled_reports": 10
                }
            ),
            SubscriptionPlan(
                id="premium",
                name="Premium Plan",
                type=SubscriptionType.PREMIUM,
                description="Full features for growing organizations",
                price=99.99,
                features=[
                    "All Basic features",
                    "Unlimited reports",
                    "Advanced charting",
                    "Custom branding",
                    "API access",
                    "White-label options",
                    "24/7 support"
                ],
                limits={
                    "reports_per_month": -1,  # Unlimited
                    "storage_gb": 100,
                    "users": 25,
                    "scheduled_reports": -1  # Unlimited
                }
            ),
            SubscriptionPlan(
                id="enterprise",
                name="Enterprise Plan",
                type=SubscriptionType.ENTERPRISE,
                description="Custom solutions for large organizations",
                price=0.0,  # Custom pricing
                features=[
                    "All Premium features",
                    "Custom integrations",
                    "Dedicated support",
                    "On-premise deployment",
                    "Custom development",
                    "SLA guarantees"
                ],
                limits={
                    "reports_per_month": -1,
                    "storage_gb": -1,
                    "users": -1,
                    "scheduled_reports": -1
                }
            )
        ]
        
        for plan in default_plans:
            self.plans[plan.id] = plan
    
    async def get_plans(self) -> List[SubscriptionPlan]:
        """Get all available subscription plans"""
        return list(self.plans.values())
    
    async def get_plan(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get a specific subscription plan"""
        return self.plans.get(plan_id)
    
    async def create_user_subscription(
        self,
        user_id: str,
        plan_id: str,
        payment_method: str = "",
        billing_address: Dict[str, str] = None,
        trial_days: int = 0
    ) -> str:
        """Create a new user subscription"""
        try:
            plan = self.plans.get(plan_id)
            if not plan:
                raise ValueError(f"Plan not found: {plan_id}")
            
            subscription_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Calculate end date based on billing cycle
            if plan.billing_cycle == "monthly":
                end_date = now + timedelta(days=30)
            elif plan.billing_cycle == "quarterly":
                end_date = now + timedelta(days=90)
            elif plan.billing_cycle == "yearly":
                end_date = now + timedelta(days=365)
            else:
                end_date = now + timedelta(days=30)
            
            # Add trial period if specified
            trial_end_date = None
            if trial_days > 0:
                trial_end_date = now + timedelta(days=trial_days)
                end_date = trial_end_date + timedelta(days=30)
            
            subscription = UserSubscription(
                id=subscription_id,
                user_id=user_id,
                plan_id=plan_id,
                status=SubscriptionStatus.ACTIVE,
                start_date=now,
                end_date=end_date,
                payment_method=payment_method,
                billing_address=billing_address or {},
                created_at=now,
                updated_at=now,
                trial_end_date=trial_end_date
            )
            
            # Store subscription
            await self._store_subscription(subscription)
            
            logger.info(f"User subscription created: {subscription_id}")
            return subscription_id
            
        except Exception as e:
            logger.error(f"Subscription creation error: {e}")
            raise
    
    async def update_subscription(
        self,
        subscription_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Update an existing subscription"""
        try:
            subscription = await self._get_subscription(subscription_id)
            if not subscription:
                return False
            
            # Update fields
            for key, value in updates.items():
                if hasattr(subscription, key):
                    setattr(subscription, key, value)
            
            subscription.updated_at = datetime.utcnow()
            
            # Store updated subscription
            await self._store_subscription(subscription)
            
            logger.info(f"Subscription updated: {subscription_id}")
            return True
            
        except Exception as e:
            logger.error(f"Subscription update error: {e}")
            return False
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        reason: str = ""
    ) -> bool:
        """Cancel a subscription"""
        try:
            subscription = await self._get_subscription(subscription_id)
            if not subscription:
                return False
            
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = datetime.utcnow()
            subscription.updated_at = datetime.utcnow()
            
            # Store updated subscription
            await self._store_subscription(subscription)
            
            # Cancel all associated report subscriptions
            await self._cancel_report_subscriptions(subscription_id)
            
            logger.info(f"Subscription cancelled: {subscription_id}")
            return True
            
        except Exception as e:
            logger.error(f"Subscription cancellation error: {e}")
            return False
    
    async def pause_subscription(self, subscription_id: str) -> bool:
        """Pause a subscription"""
        return await self.update_subscription(subscription_id, {
            'status': SubscriptionStatus.PAUSED
        })
    
    async def resume_subscription(self, subscription_id: str) -> bool:
        """Resume a paused subscription"""
        return await self.update_subscription(subscription_id, {
            'status': SubscriptionStatus.ACTIVE
        })
    
    async def get_user_subscription(self, user_id: str) -> Optional[UserSubscription]:
        """Get user's current subscription"""
        try:
            pattern = f"user_subscription:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                subscription_data = self.redis_client.get(key)
                if subscription_data:
                    subscription_dict = json.loads(subscription_data)
                    subscription = UserSubscription(**subscription_dict)
                    
                    # Check if subscription is active and not expired
                    if (subscription.status == SubscriptionStatus.ACTIVE and
                        (not subscription.end_date or subscription.end_date > datetime.utcnow())):
                        return subscription
            
            return None
            
        except Exception as e:
            logger.error(f"Get user subscription error: {e}")
            return None
    
    async def get_subscription_limits(self, user_id: str) -> Dict[str, int]:
        """Get subscription limits for a user"""
        try:
            subscription = await self.get_user_subscription(user_id)
            if not subscription:
                # Return free plan limits
                free_plan = self.plans.get("free")
                return free_plan.limits if free_plan else {}
            
            plan = self.plans.get(subscription.plan_id)
            return plan.limits if plan else {}
            
        except Exception as e:
            logger.error(f"Get subscription limits error: {e}")
            return {}
    
    async def check_usage_limit(
        self,
        user_id: str,
        limit_type: str,
        current_usage: int
    ) -> bool:
        """Check if user has exceeded a usage limit"""
        try:
            limits = await self.get_subscription_limits(user_id)
            limit = limits.get(limit_type, 0)
            
            # -1 means unlimited
            if limit == -1:
                return True
            
            return current_usage < limit
            
        except Exception as e:
            logger.error(f"Check usage limit error: {e}")
            return False
    
    async def create_report_subscription(
        self,
        user_id: str,
        schedule_id: str,
        subscription_id: str
    ) -> str:
        """Create a report subscription"""
        try:
            report_subscription_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            report_subscription = ReportSubscription(
                id=report_subscription_id,
                user_id=user_id,
                schedule_id=schedule_id,
                subscription_id=subscription_id,
                created_at=now,
                updated_at=now
            )
            
            # Store report subscription
            await self._store_report_subscription(report_subscription)
            
            logger.info(f"Report subscription created: {report_subscription_id}")
            return report_subscription_id
            
        except Exception as e:
            logger.error(f"Report subscription creation error: {e}")
            raise
    
    async def get_user_report_subscriptions(self, user_id: str) -> List[ReportSubscription]:
        """Get user's report subscriptions"""
        try:
            pattern = f"report_subscription:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            
            subscriptions = []
            for key in keys:
                subscription_data = self.redis_client.get(key)
                if subscription_data:
                    subscription_dict = json.loads(subscription_data)
                    subscription = ReportSubscription(**subscription_dict)
                    subscriptions.append(subscription)
            
            return subscriptions
            
        except Exception as e:
            logger.error(f"Get user report subscriptions error: {e}")
            return []
    
    async def cancel_report_subscription(self, report_subscription_id: str) -> bool:
        """Cancel a report subscription"""
        try:
            pattern = f"report_subscription:*:{report_subscription_id}"
            keys = self.redis_client.keys(pattern)
            
            if not keys:
                return False
            
            # Delete report subscription
            self.redis_client.delete(keys[0])
            
            logger.info(f"Report subscription cancelled: {report_subscription_id}")
            return True
            
        except Exception as e:
            logger.error(f"Cancel report subscription error: {e}")
            return False
    
    async def get_subscription_stats(self) -> Dict[str, Any]:
        """Get subscription statistics"""
        try:
            # Get all subscriptions
            pattern = "user_subscription:*"
            keys = self.redis_client.keys(pattern)
            
            total_subscriptions = len(keys)
            active_subscriptions = 0
            cancelled_subscriptions = 0
            expired_subscriptions = 0
            
            plan_counts = {}
            
            for key in keys:
                subscription_data = self.redis_client.get(key)
                if subscription_data:
                    subscription_dict = json.loads(subscription_data)
                    subscription = UserSubscription(**subscription_dict)
                    
                    # Count by status
                    if subscription.status == SubscriptionStatus.ACTIVE:
                        active_subscriptions += 1
                    elif subscription.status == SubscriptionStatus.CANCELLED:
                        cancelled_subscriptions += 1
                    elif subscription.status == SubscriptionStatus.EXPIRED:
                        expired_subscriptions += 1
                    
                    # Count by plan
                    plan_counts[subscription.plan_id] = plan_counts.get(subscription.plan_id, 0) + 1
            
            return {
                'total_subscriptions': total_subscriptions,
                'active_subscriptions': active_subscriptions,
                'cancelled_subscriptions': cancelled_subscriptions,
                'expired_subscriptions': expired_subscriptions,
                'plan_distribution': plan_counts
            }
            
        except Exception as e:
            logger.error(f"Get subscription stats error: {e}")
            return {}
    
    async def _store_subscription(self, subscription: UserSubscription):
        """Store subscription in Redis"""
        key = f"user_subscription:{subscription.user_id}:{subscription.id}"
        data = json.dumps(subscription.__dict__, default=str)
        self.redis_client.set(key, data, ex=86400 * 30)  # 30 days TTL
    
    async def _get_subscription(self, subscription_id: str) -> Optional[UserSubscription]:
        """Get subscription from Redis"""
        pattern = f"user_subscription:*:{subscription_id}"
        keys = self.redis_client.keys(pattern)
        
        if keys:
            subscription_data = self.redis_client.get(keys[0])
            if subscription_data:
                subscription_dict = json.loads(subscription_data)
                return UserSubscription(**subscription_dict)
        
        return None
    
    async def _store_report_subscription(self, subscription: ReportSubscription):
        """Store report subscription in Redis"""
        key = f"report_subscription:{subscription.user_id}:{subscription.id}"
        data = json.dumps(subscription.__dict__, default=str)
        self.redis_client.set(key, data, ex=86400 * 30)  # 30 days TTL
    
    async def _cancel_report_subscriptions(self, subscription_id: str):
        """Cancel all report subscriptions for a user subscription"""
        try:
            pattern = f"report_subscription:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                subscription_data = self.redis_client.get(key)
                if subscription_data:
                    subscription_dict = json.loads(subscription_data)
                    subscription = ReportSubscription(**subscription_dict)
                    
                    if subscription.subscription_id == subscription_id:
                        # Delete report subscription
                        self.redis_client.delete(key)
                        
        except Exception as e:
            logger.error(f"Cancel report subscriptions error: {e}")
