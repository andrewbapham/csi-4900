import React from 'react';
import { CheckCircle, XCircle, Edit3, Save } from 'lucide-react';

const AnnotationList = ({
    annotations,
    hoveredAnnotation,
    setHoveredAnnotation,
    selectedAnnotation,
    setSelectedAnnotation,
    editingAnnotation,
    editAnnotation,
    saveAnnotationEdit,
    validateAnnotation,
    invalidateAnnotation,
    formatClassName
}) => {
    return (
        <div className="annotations-section">
            <h3>Annotations ({annotations.length})</h3>
            <div className="annotations-list">
                {annotations.map((annotation, index) => (
                    <div
                        key={annotation.id || index}
                        className={`annotation-item ${annotation.validated ? 'validated' : ''} ${hoveredAnnotation === index ? 'hovered' : ''} ${selectedAnnotation === index ? 'selected' : ''}`}
                        onMouseEnter={() => setHoveredAnnotation(index)}
                        onMouseLeave={() => setHoveredAnnotation(null)}
                        onClick={() => setSelectedAnnotation(selectedAnnotation === index ? null : index)}
                    >
                        <div className="annotation-main">
                            <div className="annotation-info">
                                <span className="class-name">{formatClassName(annotation.class)}</span>
                                {annotation.confidence && annotation.confidence < 1 && (
                                    <span className="confidence">{(annotation.confidence * 100).toFixed(1)}%</span>
                                )}
                                <span className="raw-class">({annotation.class})</span>
                            </div>
                            <div className="annotation-actions">
                                {editingAnnotation === index ? (
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            saveAnnotationEdit(index, document.querySelector('.edit-form input').value);
                                        }}
                                        title="Save"
                                    >
                                        <Save size={14} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                editAnnotation(index);
                                            }}
                                            title="Edit class"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                validateAnnotation(index);
                                            }}
                                            title="Validate"
                                        >
                                            <CheckCircle size={14} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                invalidateAnnotation(index);
                                            }}
                                            title="Invalidate"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        {editingAnnotation === index && (
                            <div className="edit-form">
                                <input
                                    type="text"
                                    defaultValue={annotation.class}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            saveAnnotationEdit(index, e.target.value);
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnotationList;
