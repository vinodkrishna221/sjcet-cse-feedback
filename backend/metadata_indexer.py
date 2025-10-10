"""
Metadata indexing system for reports and files
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import redis
from elasticsearch import Elasticsearch
import os

logger = logging.getLogger(__name__)

class IndexType(Enum):
    REPORTS = "reports"
    FILES = "files"
    USERS = "users"
    FEEDBACK = "feedback"

@dataclass
class IndexDocument:
    id: str
    type: IndexType
    title: str
    content: str
    metadata: Dict[str, Any]
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    user_id: str
    visibility: str = "private"  # private, public, restricted

class MetadataIndexer:
    """Service for indexing and searching metadata"""
    
    def __init__(self, elasticsearch_url: str = None, redis_url: str = None):
        self.elasticsearch_url = elasticsearch_url or os.environ.get('ELASTICSEARCH_URL', 'http://localhost:9200')
        self.redis_client = redis.from_url(redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        
        # Initialize Elasticsearch client
        self.es_client = Elasticsearch([self.elasticsearch_url])
        
        # Index names
        self.index_names = {
            IndexType.REPORTS: "reports_index",
            IndexType.FILES: "files_index",
            IndexType.USERS: "users_index",
            IndexType.FEEDBACK: "feedback_index"
        }
        
        # Initialize indexes
        self._initialize_indexes()
    
    def _initialize_indexes(self):
        """Initialize Elasticsearch indexes with mappings"""
        for index_type, index_name in self.index_names.items():
            if not self.es_client.indices.exists(index=index_name):
                mapping = self._get_index_mapping(index_type)
                self.es_client.indices.create(
                    index=index_name,
                    body=mapping
                )
                logger.info(f"Created index: {index_name}")
    
    def _get_index_mapping(self, index_type: IndexType) -> Dict[str, Any]:
        """Get Elasticsearch mapping for index type"""
        base_mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "type": {"type": "keyword"},
                    "title": {
                        "type": "text",
                        "analyzer": "standard",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "content": {
                        "type": "text",
                        "analyzer": "standard"
                    },
                    "metadata": {"type": "object"},
                    "tags": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                    "user_id": {"type": "keyword"},
                    "visibility": {"type": "keyword"}
                }
            }
        }
        
        # Add type-specific mappings
        if index_type == IndexType.REPORTS:
            base_mapping["mappings"]["properties"].update({
                "report_type": {"type": "keyword"},
                "format": {"type": "keyword"},
                "parameters": {"type": "object"},
                "file_id": {"type": "keyword"},
                "status": {"type": "keyword"}
            })
        elif index_type == IndexType.FILES:
            base_mapping["mappings"]["properties"].update({
                "filename": {"type": "text"},
                "file_type": {"type": "keyword"},
                "size": {"type": "long"},
                "content_type": {"type": "keyword"},
                "checksum": {"type": "keyword"},
                "file_path": {"type": "keyword"}
            })
        elif index_type == IndexType.FEEDBACK:
            base_mapping["mappings"]["properties"].update({
                "semester": {"type": "keyword"},
                "academic_year": {"type": "keyword"},
                "student_section": {"type": "keyword"},
                "faculty_id": {"type": "keyword"},
                "rating": {"type": "float"},
                "is_anonymous": {"type": "boolean"}
            })
        
        return base_mapping
    
    async def index_document(self, document: IndexDocument) -> bool:
        """Index a document in Elasticsearch"""
        try:
            index_name = self.index_names[document.type]
            
            # Prepare document for indexing
            doc_data = asdict(document)
            doc_data['created_at'] = document.created_at.isoformat()
            doc_data['updated_at'] = document.updated_at.isoformat()
            
            # Index document
            response = self.es_client.index(
                index=index_name,
                id=document.id,
                body=doc_data
            )
            
            if response['result'] in ['created', 'updated']:
                logger.info(f"Document indexed: {document.id}")
                return True
            else:
                logger.error(f"Failed to index document: {document.id}")
                return False
                
        except Exception as e:
            logger.error(f"Indexing error: {e}")
            return False
    
    async def search_documents(
        self,
        index_type: IndexType,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Search documents in Elasticsearch"""
        try:
            index_name = self.index_names[index_type]
            
            # Build search query
            search_body = {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["title^2", "content", "tags"]
                                }
                            }
                        ]
                    }
                },
                "sort": [
                    {"created_at": {"order": "desc"}}
                ],
                "from": offset,
                "size": limit
            }
            
            # Add filters
            if filters:
                filter_queries = []
                for field, value in filters.items():
                    if isinstance(value, list):
                        filter_queries.append({
                            "terms": {field: value}
                        })
                    else:
                        filter_queries.append({
                            "term": {field: value}
                        })
                
                if filter_queries:
                    search_body["query"]["bool"]["filter"] = filter_queries
            
            # Add user visibility filter
            if user_id:
                search_body["query"]["bool"]["should"] = [
                    {"term": {"user_id": user_id}},
                    {"term": {"visibility": "public"}}
                ]
                search_body["query"]["bool"]["minimum_should_match"] = 1
            
            # Execute search
            response = self.es_client.search(
                index=index_name,
                body=search_body
            )
            
            # Process results
            results = []
            for hit in response['hits']['hits']:
                result = hit['_source']
                result['_score'] = hit['_score']
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    async def get_document(self, index_type: IndexType, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific document by ID"""
        try:
            index_name = self.index_names[index_type]
            
            response = self.es_client.get(
                index=index_name,
                id=document_id
            )
            
            if response['found']:
                return response['_source']
            else:
                return None
                
        except Exception as e:
            logger.error(f"Get document error: {e}")
            return None
    
    async def update_document(self, index_type: IndexType, document_id: str, updates: Dict[str, Any]) -> bool:
        """Update a document in the index"""
        try:
            index_name = self.index_names[index_type]
            
            # Add updated_at timestamp
            updates['updated_at'] = datetime.utcnow().isoformat()
            
            response = self.es_client.update(
                index=index_name,
                id=document_id,
                body={"doc": updates}
            )
            
            if response['result'] in ['updated', 'noop']:
                logger.info(f"Document updated: {document_id}")
                return True
            else:
                logger.error(f"Failed to update document: {document_id}")
                return False
                
        except Exception as e:
            logger.error(f"Update document error: {e}")
            return False
    
    async def delete_document(self, index_type: IndexType, document_id: str) -> bool:
        """Delete a document from the index"""
        try:
            index_name = self.index_names[index_type]
            
            response = self.es_client.delete(
                index=index_name,
                id=document_id
            )
            
            if response['result'] == 'deleted':
                logger.info(f"Document deleted: {document_id}")
                return True
            else:
                logger.error(f"Failed to delete document: {document_id}")
                return False
                
        except Exception as e:
            logger.error(f"Delete document error: {e}")
            return False
    
    async def get_aggregations(
        self,
        index_type: IndexType,
        field: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[str, int]]:
        """Get aggregations for a field"""
        try:
            index_name = self.index_names[index_type]
            
            # Build aggregation query
            agg_body = {
                "size": 0,
                "aggs": {
                    "field_agg": {
                        "terms": {
                            "field": field,
                            "size": 100
                        }
                    }
                }
            }
            
            # Add filters if provided
            if filters:
                agg_body["query"] = {
                    "bool": {
                        "filter": [
                            {"term": {k: v} for k, v in filters.items()}
                        ]
                    }
                }
            
            response = self.es_client.search(
                index=index_name,
                body=agg_body
            )
            
            # Process aggregation results
            buckets = response['aggregations']['field_agg']['buckets']
            return [(bucket['key'], bucket['doc_count']) for bucket in buckets]
            
        except Exception as e:
            logger.error(f"Aggregation error: {e}")
            return []
    
    async def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics for all indexes"""
        try:
            stats = {}
            
            for index_type, index_name in self.index_names.items():
                try:
                    response = self.es_client.indices.stats(index=index_name)
                    index_stats = response['indices'][index_name]
                    
                    stats[index_type.value] = {
                        'document_count': index_stats['total']['docs']['count'],
                        'index_size': index_stats['total']['store']['size_in_bytes'],
                        'index_size_mb': round(index_stats['total']['store']['size_in_bytes'] / (1024 * 1024), 2)
                    }
                except Exception as e:
                    logger.error(f"Failed to get stats for {index_name}: {e}")
                    stats[index_type.value] = {
                        'document_count': 0,
                        'index_size': 0,
                        'index_size_mb': 0
                    }
            
            return stats
            
        except Exception as e:
            logger.error(f"Get index stats error: {e}")
            return {}
    
    async def reindex_documents(self, index_type: IndexType) -> bool:
        """Reindex all documents of a type"""
        try:
            index_name = self.index_names[index_type]
            
            # Create new index with timestamp
            new_index_name = f"{index_name}_reindex_{int(datetime.utcnow().timestamp())}"
            
            # Copy mapping
            mapping = self._get_index_mapping(index_type)
            self.es_client.indices.create(index=new_index_name, body=mapping)
            
            # Reindex documents
            reindex_body = {
                "source": {"index": index_name},
                "dest": {"index": new_index_name}
            }
            
            response = self.es_client.reindex(body=reindex_body)
            
            if response['total'] > 0:
                # Delete old index and rename new one
                self.es_client.indices.delete(index=index_name)
                self.es_client.indices.put_alias(
                    index=new_index_name,
            name=index_name
                )
                
                logger.info(f"Reindexed {response['total']} documents for {index_type.value}")
                return True
            else:
                logger.error(f"Failed to reindex documents for {index_type.value}")
                return False
                
        except Exception as e:
            logger.error(f"Reindex error: {e}")
            return False
    
    async def cleanup_old_documents(self, index_type: IndexType, days_old: int = 30) -> int:
        """Clean up old documents from index"""
        try:
            index_name = self.index_names[index_type]
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Delete old documents
            delete_body = {
                "query": {
                    "range": {
                        "created_at": {
                            "lt": cutoff_date.isoformat()
                        }
                    }
                }
            }
            
            response = self.es_client.delete_by_query(
                index=index_name,
                body=delete_body
            )
            
            deleted_count = response['deleted']
            logger.info(f"Cleaned up {deleted_count} old documents from {index_type.value}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            return 0
