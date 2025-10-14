import React from 'react';
import { CheckCircle, XCircle, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Annotation } from '@/types';

interface AnnotationListProps {
    annotations: Annotation[];
    hoveredAnnotation: string | null;
    setHoveredAnnotation: (id: string | null) => void;
    selectedAnnotation: string | null;
    setSelectedAnnotation: (id: string | null) => void;
    editingAnnotation: string | null;
    editAnnotation: (id: string) => void;
    saveAnnotationEdit: (id: string, newLabel: string) => void;
    validateAnnotation: (id: string) => void;
    invalidateAnnotation: (id: string) => void;
    formatClassName: (className: string | undefined | null) => string;
}

const AnnotationList: React.FC<AnnotationListProps> = ({
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
        <div className="space-y-2">
            {annotations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No annotations found</p>
            ) : (
                annotations.map((annotation, index) => (
                    <Card
                        key={annotation.id}
                        className={`mx-1 cursor-pointer transition-colors ${
                            index === 0 ? 'mt-1' : ''
                        } ${
                            hoveredAnnotation === annotation.id ? 'bg-muted' : ''
                        } ${
                            selectedAnnotation === annotation.id ? 'ring-2 ring-primary' : ''
                        } ${
                            annotation.validated ? 'bg-green-200' : ''
                        }`}
                        onMouseEnter={() => setHoveredAnnotation(annotation.id)}
                        onMouseLeave={() => setHoveredAnnotation(null)}
                        onClick={() => setSelectedAnnotation(selectedAnnotation === annotation.id ? null : annotation.id)}
                    >
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="default" className='rounded-md'>
                                            {formatClassName(annotation.value)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {annotation.value}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {editingAnnotation === annotation.id ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const input = document.querySelector(`#edit-${annotation.id}`) as HTMLInputElement;
                                                if (input) {
                                                    saveAnnotationEdit(annotation.id, input.value);
                                                }
                                            }}
                                        >
                                            <Save size={14} />
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    editAnnotation(annotation.id);
                                                }}
                                            >
                                                <Edit3 size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    validateAnnotation(annotation.id);
                                                }}
                                            >
                                                <CheckCircle size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    invalidateAnnotation(annotation.id);
                                                }}
                                            >
                                                <XCircle size={14} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {editingAnnotation === annotation.id && (
                                <div className="mt-2">
                                    <Input
                                        id={`edit-${annotation.id}`}
                                        type="text"
                                        defaultValue={annotation.value}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                saveAnnotationEdit(annotation.id, e.currentTarget.value);
                                            }
                                        }}
                                        autoFocus
                                        className="text-sm"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
};

export default AnnotationList;
