import React, { RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import ImageGallery from './ImageGallery';
import UploadSection from './UploadSection';
import MetadataDisplay from './MetadataDisplay';
import AnnotationList from './AnnotationList';
import { Annotation, ImageMetadata, Pagination } from '@/types';

interface SidebarProps {
    sidebarWidth: number;
    apiImages: string[];
    currentImageIndex: number;
    apiBaseUrl: string;
    pagination: Pagination | null;
    currentPage: number;
    loadingImages: boolean;
    loadApiImages: (page: number) => void;
    handleImageSelect: (index: number) => Promise<void>;
    fileInputRef: RefObject<HTMLInputElement>;
    jsonInputRef: RefObject<HTMLInputElement>;
    handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loadImageFromApi: (imageId: string) => Promise<void>;
    loading: boolean;
    currentImageMetadata: ImageMetadata | null;
    annotations: Annotation[];
    hoveredAnnotation: string | null;
    setHoveredAnnotation: (id: string | null) => void;
    selectedAnnotation: string | null;
    setSelectedAnnotation: (id: string | null) => void;
    editingAnnotation: string | null;
    editAnnotation: (id: string) => void;
    saveAnnotationEdit: (id: string, newValue: string) => void;
    validateAnnotation: (id: string) => void;
    invalidateAnnotation: (id: string) => void;
    deleteAnnotation: (id: string) => void;
    restoreAnnotation: (id: string) => void;
    formatClassName: (className: string | undefined | null) => string;
}

const Sidebar: React.FC<SidebarProps> = ({
    sidebarWidth,
    apiImages,
    currentImageIndex,
    apiBaseUrl,
    pagination,
    currentPage,
    loadingImages,
    loadApiImages,
    handleImageSelect,
    fileInputRef,
    jsonInputRef,
    handleImageUpload,
    handleJsonUpload,
    loadImageFromApi,
    loading,
    currentImageMetadata,
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
    deleteAnnotation,
    restoreAnnotation,
    formatClassName
}) => {
    return (
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
            <Accordion type="multiple" defaultValue={["load-data", "image-gallery", "metadata", "annotations"]} className="w-full">
                <AccordionItem value="load-data">
                    <AccordionTrigger>Load Data</AccordionTrigger>
                    <AccordionContent>
                        <UploadSection
                            apiImages={apiImages}
                            loadImageFromApi={loadImageFromApi}
                            fileInputRef={fileInputRef}
                            jsonInputRef={jsonInputRef}
                            handleImageUpload={handleImageUpload}
                            handleJsonUpload={handleJsonUpload}
                            loading={loading}
                        />
                    </AccordionContent>
                </AccordionItem>

                {apiImages.length > 0 && (
                    <AccordionItem value="image-gallery">
                        <AccordionTrigger>Image Gallery</AccordionTrigger>
                        <AccordionContent>
                            <ImageGallery
                                images={apiImages.map(id => ({ id, url: `${apiBaseUrl}/api/images/${id}` }))}
                                currentIndex={currentImageIndex}
                                onImageSelect={handleImageSelect}
                            />
                            {pagination && (
                                <div className="pagination-controls mt-4">
                                    <div className="pagination-info text-sm text-muted-foreground mb-2">
                                        Page {pagination.page} of {pagination.pages}
                                        ({pagination.total_images} total images)
                                    </div>
                                    <div className="pagination-buttons flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadApiImages(currentPage - 1)}
                                            disabled={!pagination.has_prev || loadingImages}
                                        >
                                            <ChevronLeft size={14} />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadApiImages(currentPage + 1)}
                                            disabled={!pagination.has_next || loadingImages}
                                        >
                                            Next
                                            <ChevronRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                )}

                <AccordionItem value="metadata">
                    <AccordionTrigger>Image Metadata</AccordionTrigger>
                    <AccordionContent>
                        <MetadataDisplay currentImageMetadata={currentImageMetadata} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="annotations">
                    <AccordionTrigger>Annotations ({annotations.length})</AccordionTrigger>
                    <AccordionContent>
                        <AnnotationList
                            annotations={annotations}
                            hoveredAnnotation={hoveredAnnotation}
                            setHoveredAnnotation={setHoveredAnnotation}
                            selectedAnnotation={selectedAnnotation}
                            setSelectedAnnotation={setSelectedAnnotation}
                            editingAnnotation={editingAnnotation}
                            editAnnotation={editAnnotation}
                            saveAnnotationEdit={saveAnnotationEdit}
                            validateAnnotation={validateAnnotation}
                            invalidateAnnotation={invalidateAnnotation}
                            deleteAnnotation={deleteAnnotation}
                            restoreAnnotation={restoreAnnotation}
                            formatClassName={formatClassName}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

export default Sidebar;
