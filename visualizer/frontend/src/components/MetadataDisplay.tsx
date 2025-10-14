import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageMetadata } from '@/types';

interface MetadataDisplayProps {
    currentImageMetadata: ImageMetadata | null;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ currentImageMetadata }) => {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm">Image Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {currentImageMetadata ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Dimensions:</span>
                            <Badge variant="outline">
                                {currentImageMetadata.width} × {currentImageMetadata.height}
                            </Badge>
                        </div>
                        {currentImageMetadata.lat && currentImageMetadata.lon && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Location:</span>
                                <span className="text-xs text-muted-foreground">
                                    {currentImageMetadata.lat.toFixed(6)}, {currentImageMetadata.lon.toFixed(6)}
                                </span>
                            </div>
                        )}
                        {currentImageMetadata.cameraType && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Camera Type:</span>
                                <span className="text-xs text-muted-foreground">{currentImageMetadata.cameraType}</span>
                            </div>
                        )}
                        {currentImageMetadata.creator && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Creator:</span>
                                <span className="text-xs text-muted-foreground">{currentImageMetadata.creator.username}</span>
                            </div>
                        )}
                        {currentImageMetadata.sequence && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Sequence:</span>
                                <span className="text-xs text-muted-foreground">{currentImageMetadata.sequence}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Upload annotations to view metadata
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default MetadataDisplay;
