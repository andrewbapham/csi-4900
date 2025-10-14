import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { TRAFFIC_SIGN_CLASSES } from "../constants/trafficSignClasses";
import { formatClassName } from "../utils/annotationUtils";

const ClassAutocomplete = ({
  selectedClass,
  setSelectedClass,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClasses, setFilteredClasses] = useState(TRAFFIC_SIGN_CLASSES);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Filter classes based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClasses(TRAFFIC_SIGN_CLASSES);
    } else {
      const filtered = TRAFFIC_SIGN_CLASSES.filter((className) => {
        const formatted = formatClassName(className);
        return (
          formatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
          className.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredClasses(filtered);
    }
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredClasses.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredClasses.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (
            highlightedIndex >= 0 &&
            highlightedIndex < filteredClasses.length
          ) {
            handleClassSelect(filteredClasses[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchTerm("");
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, filteredClasses]);

  // Handle clicks outside component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleClassSelect = (className) => {
    setSelectedClass(className);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const getDisplayValue = () => {
    if (searchTerm && isOpen) {
      return searchTerm;
    }
    return formatClassName(selectedClass);
  };

  const getCategoryColor = (className) => {
    if (className.startsWith("regulatory--")) return "#dc3545";
    if (className.startsWith("warning--")) return "#ffc107";
    if (className.startsWith("information--")) return "#007bff";
    if (className.startsWith("complementary--")) return "#28a745";
    return "#6c757d";
  };

  return (
    <div className="class-autocomplete" ref={containerRef}>
      <label htmlFor="traffic-sign-class">Traffic Sign Class:</label>

      <div className="autocomplete-input-container">
        <div className="autocomplete-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            id="traffic-sign-class"
            className={`autocomplete-input ${isOpen ? "open" : ""}`}
            value={getDisplayValue()}
            onChange={handleInputChange}
            onClick={handleInputClick}
            placeholder="Search traffic signs..."
            disabled={disabled}
            autoComplete="off"
          />
          <ChevronDown
            size={16}
            className={`dropdown-arrow ${isOpen ? "open" : ""}`}
            onClick={handleInputClick}
          />
        </div>

        {isOpen && (
          <div className="autocomplete-dropdown" ref={dropdownRef}>
            {filteredClasses.length > 0 ? (
              filteredClasses.map((className, index) => (
                <div
                  key={className}
                  className={`autocomplete-option ${
                    index === highlightedIndex ? "highlighted" : ""
                  } ${className === selectedClass ? "selected" : ""}`}
                  onClick={() => handleClassSelect(className)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div
                    className="class-category-indicator"
                    style={{ backgroundColor: getCategoryColor(className) }}
                  />
                  <div className="class-info">
                    <div className="class-name">
                      {formatClassName(className)}
                    </div>
                    <div className="class-id">{className}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="autocomplete-no-results">
                No matching traffic signs found
              </div>
            )}
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="selected-class-preview">
          <div
            className="class-category-indicator"
            style={{ backgroundColor: getCategoryColor(selectedClass) }}
          />
          <span className="selected-class-text">
            Selected: {formatClassName(selectedClass)}
          </span>
        </div>
      )}
    </div>
  );
};

export default ClassAutocomplete;
