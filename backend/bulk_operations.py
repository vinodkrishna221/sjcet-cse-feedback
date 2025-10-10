"""
Bulk operations utilities for API endpoints
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class BulkOperationResult(BaseModel):
    """Result of a bulk operation"""
    success: bool
    processed: int
    successful: int
    failed: int
    errors: List[Dict[str, Any]]

class BulkCreateRequest(BaseModel):
    """Request for bulk create operations"""
    items: List[Dict[str, Any]]

class BulkUpdateRequest(BaseModel):
    """Request for bulk update operations"""
    updates: List[Dict[str, Any]]  # Each item should have 'id' and 'data'

class BulkDeleteRequest(BaseModel):
    """Request for bulk delete operations"""
    ids: List[str]

class BulkOperationsHelper:
    """Helper class for bulk operations"""
    
    @staticmethod
    async def bulk_create(
        collection: str,
        items: List[Dict[str, Any]],
        validate_func: Optional[callable] = None
    ) -> BulkOperationResult:
        """Perform bulk create operation"""
        from database import DatabaseOperations
        
        result = BulkOperationResult(
            success=True,
            processed=len(items),
            successful=0,
            failed=0,
            errors=[]
        )
        
        for i, item in enumerate(items):
            try:
                # Validate item if validation function provided
                if validate_func:
                    validation_errors = validate_func(item)
                    if validation_errors:
                        result.errors.append({
                            "index": i,
                            "item": item,
                            "errors": validation_errors
                        })
                        result.failed += 1
                        continue
                
                # Create item
                await DatabaseOperations.insert_one(collection, item)
                result.successful += 1
                
            except Exception as e:
                logger.error(f"Bulk create error for item {i}: {e}")
                result.errors.append({
                    "index": i,
                    "item": item,
                    "error": str(e)
                })
                result.failed += 1
        
        result.success = result.failed == 0
        return result
    
    @staticmethod
    async def bulk_update(
        collection: str,
        updates: List[Dict[str, Any]],
        validate_func: Optional[callable] = None
    ) -> BulkOperationResult:
        """Perform bulk update operation"""
        from database import DatabaseOperations
        
        result = BulkOperationResult(
            success=True,
            processed=len(updates),
            successful=0,
            failed=0,
            errors=[]
        )
        
        for i, update in enumerate(updates):
            try:
                item_id = update.get("id")
                if not item_id:
                    result.errors.append({
                        "index": i,
                        "update": update,
                        "error": "Missing 'id' field"
                    })
                    result.failed += 1
                    continue
                
                update_data = update.get("data", {})
                
                # Validate update data if validation function provided
                if validate_func:
                    validation_errors = validate_func(update_data)
                    if validation_errors:
                        result.errors.append({
                            "index": i,
                            "update": update,
                            "errors": validation_errors
                        })
                        result.failed += 1
                        continue
                
                # Update item
                update_result = await DatabaseOperations.update_one(
                    collection,
                    {"id": item_id},
                    update_data
                )
                
                if update_result.modified_count > 0:
                    result.successful += 1
                else:
                    result.errors.append({
                        "index": i,
                        "update": update,
                        "error": "Item not found or no changes made"
                    })
                    result.failed += 1
                
            except Exception as e:
                logger.error(f"Bulk update error for item {i}: {e}")
                result.errors.append({
                    "index": i,
                    "update": update,
                    "error": str(e)
                })
                result.failed += 1
        
        result.success = result.failed == 0
        return result
    
    @staticmethod
    async def bulk_delete(
        collection: str,
        ids: List[str],
        soft_delete: bool = True
    ) -> BulkOperationResult:
        """Perform bulk delete operation"""
        from database import DatabaseOperations
        from enhanced_database import EnhancedDatabaseOperations
        
        result = BulkOperationResult(
            success=True,
            processed=len(ids),
            successful=0,
            failed=0,
            errors=[]
        )
        
        for i, item_id in enumerate(ids):
            try:
                if soft_delete:
                    # Soft delete
                    success = await EnhancedDatabaseOperations.soft_delete(collection, item_id)
                else:
                    # Hard delete
                    delete_result = await DatabaseOperations.delete_one(collection, {"id": item_id})
                    success = delete_result.deleted_count > 0
                
                if success:
                    result.successful += 1
                else:
                    result.errors.append({
                        "index": i,
                        "id": item_id,
                        "error": "Item not found"
                    })
                    result.failed += 1
                
            except Exception as e:
                logger.error(f"Bulk delete error for item {i}: {e}")
                result.errors.append({
                    "index": i,
                    "id": item_id,
                    "error": str(e)
                })
                result.failed += 1
        
        result.success = result.failed == 0
        return result
    
    @staticmethod
    async def bulk_import_csv(
        collection: str,
        csv_data: str,
        field_mapping: Dict[str, str],
        validate_func: Optional[callable] = None
    ) -> BulkOperationResult:
        """Import data from CSV string"""
        import pandas as pd
        import io
        
        try:
            # Parse CSV
            df = pd.read_csv(io.StringIO(csv_data))
            
            # Map columns
            df = df.rename(columns=field_mapping)
            
            # Convert to list of dictionaries
            items = df.to_dict('records')
            
            # Perform bulk create
            return await BulkOperationsHelper.bulk_create(
                collection, items, validate_func
            )
            
        except Exception as e:
            logger.error(f"CSV import error: {e}")
            return BulkOperationResult(
                success=False,
                processed=0,
                successful=0,
                failed=0,
                errors=[{"error": str(e)}]
            )
