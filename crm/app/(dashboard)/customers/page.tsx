"use client";

import { useState, useRef, useEffect } from "react";
import { useCustomers } from "../../../hooks/use-customers";
import { useDebounce } from "../../../hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  Coffee,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Users,
  FileUp,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export default function Customers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [csvType, setCsvType] = useState<"customers" | "orders">("customers");
  const [csvText, setCsvText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: string[][];
    rowCount: number;
    errors: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const parserRef = useRef<any>(null);

  const { data, isLoading, mutate } = useCustomers(page, debouncedSearch);

  const resetUploadState = () => {
    parserRef.current?.abort();
    parserRef.current = null;
    setPendingFile(null);
    setFileProgress(null);
    setPreviewData(null);
    setShowUnsavedDialog(false);
    setShowPreviewDialog(false);
    setIsDragging(false);
  };

  useEffect(() => {
    return () => {
      // Abort parser if component unmounts
      parserRef.current?.abort();
    };
  }, []);

  const handleModalClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetUploadState();
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on new search
  };

  const handleUploadCSV = async () => {
    if (!csvText.trim()) {
      toast.warning("Please paste some CSV text first.");
      return;
    }

    setIsUploading(true);
    const endpoint = csvType === "customers" ? "/api/customers/upload" : "/api/orders/upload";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to process CSV file.");
      }

      if (result.errors && result.errors.length > 0) {
        toast.warning(
          `Processed with some warnings: ${result.message}`,
          {
            description: `Skipped ${result.errors.length} rows. Example: ${result.errors[0]}`,
            duration: 5000,
          }
        );
      } else {
        toast.success(result.message || "CSV processed successfully!");
      }

      setCsvText("");
      handleModalClose(false);
      mutate(); // Refresh the table list
    } catch (err: any) {
      toast.error("CSV Upload failed", {
        description: err.message || "Something went wrong.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFileSelection(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFileSelection(file);
    if (e.target) e.target.value = ""; // reset input
  };

  const processFileSelection = (file: File) => {
    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a valid .csv file.");
      return;
    }
    if (file.size === 0) {
      toast.error("This CSV file is empty.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("CSV files larger than 25 MB are not supported.");
      return;
    }

    if (csvText.trim().length > 0) {
      setPendingFile(file);
      setShowUnsavedDialog(true);
    } else {
      parseAndPreviewFile(file);
    }
  };

  const parseAndPreviewFile = (file: File) => {
    setFileProgress(0);
    setPendingFile(file);
    
    let rowCount = 0;
    const sampleRows: string[][] = [];
    const errors: any[] = [];
    let headers: string[] = [];

    Papa.parse(file, {
      worker: true,
      header: false,
      skipEmptyLines: false,
      step: (results, parser) => {
        parserRef.current = parser;
        rowCount++;
        
        const progress = Math.round(((results.meta.cursor || 0) / file.size) * 100);
        setFileProgress(Math.min(progress, 100));

        if (rowCount === 1) {
          headers = results.data as string[];
        } else if (rowCount <= 4) {
          sampleRows.push(results.data as string[]);
        }
        
        if (results.errors.length > 0) {
           errors.push(...results.errors);
        }
      },
      complete: () => {
        parserRef.current = null;
        setFileProgress(null);
        setPreviewData({ headers, rows: sampleRows, rowCount, errors });
        setShowPreviewDialog(true);
      },
      error: (err) => {
        parserRef.current = null;
        setFileProgress(null);
        toast.error(`Error reading CSV file: ${err.message}`);
      }
    });
  };

  const confirmUnsavedData = () => {
    setShowUnsavedDialog(false);
    if (pendingFile) parseAndPreviewFile(pendingFile);
  };

  const cancelUnsavedData = () => {
    setShowUnsavedDialog(false);
    setPendingFile(null);
  };

  const commitFile = async () => {
    if (!pendingFile) return;
    setShowPreviewDialog(false);
    
    try {
      const text = await pendingFile.text();
      setCsvText(text);
      toast.success(`Loaded ${pendingFile.name}`);
      // Release memory
      setPreviewData(null);
      setPendingFile(null);
    } catch (err) {
      toast.error("Failed to extract raw text from file.");
    }
  };

  const customersTemplate = `name,email,phone,city,tags
"Ravi Kumar","ravi1@gmail.com","9876500001","Delhi","vip;coffee-lover"
"Asha Patel","asha2@gmail.com","9876500002","Mumbai","new-customer"
"Arjun Singh","arjun3@gmail.com","9876500003","Bangalore","regular"
"Priya Sharma","priya4@gmail.com","9876500004","Chennai","vip"
"Rahul Verma","rahul5@gmail.com","9876500005","Hyderabad","coffee-lover"
"Neha Gupta","neha6@gmail.com","9876500006","Pune","new-customer"
"Amit Yadav","amit7@gmail.com","9876500007","Kolkata","regular"
"Pooja Mehta","pooja8@gmail.com","9876500008","Delhi","vip"
"Vikas Jain","vikas9@gmail.com","9876500009","Mumbai","coffee-lover"
"Anjali Kapoor","anjali10@gmail.com","9876500010","Bangalore","new-customer"
"Karan Malhotra","karan11@gmail.com","9876500011","Chennai","regular"
"Simran Kaur","simran12@gmail.com","9876500012","Hyderabad","vip"
"Rohit Mishra","rohit13@gmail.com","9876500013","Pune","coffee-lover"
"Kavya Nair","kavya14@gmail.com","9876500014","Kolkata","new-customer"
"Deepak Joshi","deepak15@gmail.com","9876500015","Delhi","regular"
"Sneha Rao","sneha16@gmail.com","9876500016","Mumbai","vip"
"Manish Saxena","manish17@gmail.com","9876500017","Bangalore","coffee-lover"
"Ritu Agarwal","ritu18@gmail.com","9876500018","Chennai","new-customer"
"Varun Arora","varun19@gmail.com","9876500019","Hyderabad","regular"
"Nidhi Bansal","nidhi20@gmail.com","9876500020","Pune","vip"
"Aditya Khanna","aditya21@gmail.com","9876500021","Kolkata","new-customer"
"Meera Iyer","meera22@gmail.com","9876500022","Delhi","regular"
"Sachin Tiwari","sachin23@gmail.com","9876500023","Mumbai","vip"
"Divya Menon","divya24@gmail.com","9876500024","Bangalore","coffee-lover"
"Nikhil Sharma","nikhil25@gmail.com","9876500025","Chennai","new-customer"
"Ishita Verma","ishita26@gmail.com","9876500026","Hyderabad","regular"
"Harsh Gupta","harsh27@gmail.com","9876500027","Pune","vip"
"Tanvi Desai","tanvi28@gmail.com","9876500028","Kolkata","coffee-lover"
"Abhishek Roy","abhishek29@gmail.com","9876500029","Delhi","new-customer"
"Shreya Kapoor","shreya30@gmail.com","9876500030","Mumbai","regular"
"Akash Srivastava","akash31@gmail.com","9876500031","Bangalore","vip"
"Riya Choudhary","riya32@gmail.com","9876500032","Chennai","coffee-lover"
"Vivek Pandey","vivek33@gmail.com","9876500033","Hyderabad","new-customer"
"Muskan Arora","muskan34@gmail.com","9876500034","Pune","regular"
"Yash Malhotra","yash35@gmail.com","9876500035","Kolkata","vip"
"Payal Jain","payal36@gmail.com","9876500036","Delhi","coffee-lover"
"Ankit Sinha","ankit37@gmail.com","9876500037","Mumbai","new-customer"
"Sakshi Mishra","sakshi38@gmail.com","9876500038","Bangalore","regular"
"Gaurav Bhatia","gaurav39@gmail.com","9876500039","Chennai","vip"
"Preeti Sharma","preeti40@gmail.com","9876500040","Hyderabad","coffee-lover"
"Rohan Malhotra","rohan41@gmail.com","9876500041","Pune","new-customer"
"Aditi Sharma","aditi42@gmail.com","9876500042","Kolkata","regular"
"Mohit Gupta","mohit43@gmail.com","9876500043","Delhi","vip"
"Tanisha Verma","tanisha44@gmail.com","9876500044","Mumbai","coffee-lover"
"Siddharth Jain","siddharth45@gmail.com","9876500045","Bangalore","new-customer"
"Ananya Rao","ananya46@gmail.com","9876500046","Chennai","regular"
"Prateek Singh","prateek47@gmail.com","9876500047","Hyderabad","vip"
"Khushi Kapoor","khushi48@gmail.com","9876500048","Pune","coffee-lover"
"Nitin Yadav","nitin49@gmail.com","9876500049","Kolkata","new-customer"
"Palak Mehta","palak50@gmail.com","9876500050","Delhi","regular"
"Arnav Bansal","arnav51@gmail.com","9876500051","Mumbai","vip"
"Shruti Iyer","shruti52@gmail.com","9876500052","Bangalore","coffee-lover"
"Dev Patel","dev53@gmail.com","9876500053","Chennai","new-customer"
"Ira Nair","ira54@gmail.com","9876500054","Hyderabad","regular"
"Ritesh Saxena","ritesh55@gmail.com","9876500055","Pune","vip"
"Diya Chawla","diya56@gmail.com","9876500056","Kolkata","coffee-lover"
"Kunal Arora","kunal57@gmail.com","9876500057","Delhi","new-customer"
"Bhavya Sethi","bhavya58@gmail.com","9876500058","Mumbai","regular"
"Arjun Kapoor","arjun59@gmail.com","9876500059","Bangalore","vip"
"Mansi Tiwari","mansi60@gmail.com","9876500060","Chennai","coffee-lover"
"Rahul Khanna","rahul61@gmail.com","9876500061","Hyderabad","new-customer"
"Sanya Mehra","sanya62@gmail.com","9876500062","Pune","regular"
"Ajay Verma","ajay63@gmail.com","9876500063","Kolkata","vip"
"Priyanka Nair","priyanka64@gmail.com","9876500064","Delhi","coffee-lover"
"Kabir Sharma","kabir65@gmail.com","9876500065","Mumbai","new-customer"
"Radhika Iyer","radhika66@gmail.com","9876500066","Bangalore","regular"
"Vivek Malhotra","vivek67@gmail.com","9876500067","Chennai","vip"
"Ananya Gupta","ananya68@gmail.com","9876500068","Hyderabad","coffee-lover"
"Harshit Jain","harshit69@gmail.com","9876500069","Pune","new-customer"
"Megha Kapoor","megha70@gmail.com","9876500070","Kolkata","regular"
"Rajat Singh","rajat71@gmail.com","9876500071","Delhi","vip"
"Shivani Arora","shivani72@gmail.com","9876500072","Mumbai","coffee-lover"
"Naveen Patel","naveen73@gmail.com","9876500073","Bangalore","new-customer"
"Isha Bhatia","isha74@gmail.com","9876500074","Chennai","regular"
"Sameer Yadav","sameer75@gmail.com","9876500075","Hyderabad","vip"
"Tanya Mishra","tanya76@gmail.com","9876500076","Pune","coffee-lover"
"Rohan Desai","rohan77@gmail.com","9876500077","Kolkata","new-customer"
"Neeti Saxena","neeti78@gmail.com","9876500078","Delhi","regular"
"Arpit Chawla","arpit79@gmail.com","9876500079","Mumbai","vip"
"Pallavi Joshi","pallavi80@gmail.com","9876500080","Bangalore","coffee-lover"
"Aditya Malhotra","aditya81@gmail.com","9876500081","Chennai","new-customer"
"Riya Sharma","riya82@gmail.com","9876500082","Hyderabad","regular"
"Kunal Gupta","kunal83@gmail.com","9876500083","Pune","vip"
"Anushka Jain","anushka84@gmail.com","9876500084","Kolkata","coffee-lover"
"Rohit Kapoor","rohit85@gmail.com","9876500085","Delhi","new-customer"
"Mehak Verma","mehak86@gmail.com","9876500086","Mumbai","regular"
"Yuvraj Singh","yuvraj87@gmail.com","9876500087","Bangalore","vip"
"Nikita Arora","nikita88@gmail.com","9876500088","Chennai","coffee-lover"
"Harshita Mehta","harshita89@gmail.com","9876500089","Hyderabad","new-customer"
"Armaan Bansal","armaan90@gmail.com","9876500090","Pune","regular"
"Suhani Patel","suhani91@gmail.com","9876500091","Kolkata","vip"
"Ayush Sharma","ayush92@gmail.com","9876500092","Delhi","coffee-lover"
"Ritika Nair","ritika93@gmail.com","9876500093","Mumbai","new-customer"
"Devansh Gupta","devansh94@gmail.com","9876500094","Bangalore","regular"
"Sakshi Kapoor","sakshi95@gmail.com","9876500095","Chennai","vip"
"Manav Joshi","manav96@gmail.com","9876500096","Hyderabad","coffee-lover"
"Prachi Singh","prachi97@gmail.com","9876500097","Pune","new-customer"
"Keshav Mishra","keshav98@gmail.com","9876500098","Kolkata","regular"
"Avni Choudhary","avni99@gmail.com","9876500099","Delhi","vip"
"Dhruv Sethi","dhruv100@gmail.com","9876500100","Mumbai","coffee-lover"
`;
  const ordersTemplate = `email,totalAmount,storeLocation
"ravi1@gmail.com",1250,"Delhi Cafe"
"asha2@gmail.com",450,"Online"
"arjun3@gmail.com",980,"Bangalore Store"
"priya4@gmail.com",2100,"Chennai Outlet"
"rahul5@gmail.com",650,"Hyderabad Hub"
"neha6@gmail.com",890,"Pune Cafe"
"amit7@gmail.com",740,"Kolkata Store"
"pooja8@gmail.com",1320,"Delhi Cafe"
"vikas9@gmail.com",560,"Mumbai Store"
"anjali10@gmail.com",1750,"Bangalore Store"
"karan11@gmail.com",820,"Chennai Outlet"
"simran12@gmail.com",1490,"Hyderabad Hub"
"rohit13@gmail.com",690,"Pune Cafe"
"kavya14@gmail.com",1180,"Kolkata Store"
"deepak15@gmail.com",930,"Delhi Cafe"
"sneha16@gmail.com",1640,"Mumbai Store"
"manish17@gmail.com",720,"Bangalore Store"
"ritu18@gmail.com",540,"Chennai Outlet"
"varun19@gmail.com",1370,"Hyderabad Hub"
"nidhi20@gmail.com",860,"Pune Cafe"
"aditya21@gmail.com",1120,"Kolkata Store"
"meera22@gmail.com",780,"Delhi Cafe"
"sachin23@gmail.com",1850,"Mumbai Store"
"divya24@gmail.com",920,"Bangalore Store"
"nikhil25@gmail.com",610,"Chennai Outlet"
"ishita26@gmail.com",1340,"Hyderabad Hub"
"harsh27@gmail.com",2200,"Pune Cafe"
"tanvi28@gmail.com",870,"Kolkata Store"
"abhishek29@gmail.com",490,"Delhi Cafe"
"shreya30@gmail.com",1560,"Mumbai Store"
"akash31@gmail.com",2430,"Bangalore Store"
"riya32@gmail.com",960,"Chennai Outlet"
"vivek33@gmail.com",720,"Hyderabad Hub"
"muskan34@gmail.com",1180,"Pune Cafe"
"yash35@gmail.com",2050,"Kolkata Store"
"payal36@gmail.com",840,"Delhi Cafe"
"ankit37@gmail.com",570,"Mumbai Store"
"sakshi38@gmail.com",1290,"Bangalore Store"
"gaurav39@gmail.com",1780,"Chennai Outlet"
"preeti40@gmail.com",910,"Hyderabad Hub"
"rohan41@gmail.com",980,"Pune Cafe"
"aditi42@gmail.com",1260,"Kolkata Store"
"mohit43@gmail.com",2140,"Delhi Cafe"
"tanisha44@gmail.com",750,"Mumbai Store"
"siddharth45@gmail.com",890,"Bangalore Store"
"ananya46@gmail.com",1420,"Chennai Outlet"
"prateek47@gmail.com",2360,"Hyderabad Hub"
"khushi48@gmail.com",670,"Pune Cafe"
"nitin49@gmail.com",580,"Kolkata Store"
"palak50@gmail.com",1540,"Delhi Cafe"
"arnav51@gmail.com",2480,"Mumbai Store"
"shruti52@gmail.com",930,"Bangalore Store"
"dev53@gmail.com",620,"Chennai Outlet"
"ira54@gmail.com",1170,"Hyderabad Hub"
"ritesh55@gmail.com",2010,"Pune Cafe"
"diya56@gmail.com",810,"Kolkata Store"
"kunal57@gmail.com",540,"Delhi Cafe"
"bhavya58@gmail.com",1360,"Mumbai Store"
"arjun59@gmail.com",2250,"Bangalore Store"
"mansi60@gmail.com",990,"Chennai Outlet"
"rahul61@gmail.com",1280,"Hyderabad Hub"
"sanya62@gmail.com",840,"Pune Cafe"
"ajay63@gmail.com",2190,"Kolkata Store"
"priyanka64@gmail.com",910,"Delhi Cafe"
"kabir65@gmail.com",660,"Mumbai Store"
"radhika66@gmail.com",1450,"Bangalore Store"
"vivek67@gmail.com",2320,"Chennai Outlet"
"ananya68@gmail.com",780,"Hyderabad Hub"
"harshit69@gmail.com",590,"Pune Cafe"
"megha70@gmail.com",1530,"Kolkata Store"
"rajat71@gmail.com",2410,"Delhi Cafe"
"shivani72@gmail.com",970,"Mumbai Store"
"naveen73@gmail.com",710,"Bangalore Store"
"isha74@gmail.com",1210,"Chennai Outlet"
"sameer75@gmail.com",2080,"Hyderabad Hub"
"tanya76@gmail.com",860,"Pune Cafe"
"rohan77@gmail.com",550,"Kolkata Store"
"neeti78@gmail.com",1390,"Delhi Cafe"
"arpit79@gmail.com",2260,"Mumbai Store"
"pallavi80@gmail.com",940,"Bangalore Store"
"aditya81@gmail.com",680,"Chennai Outlet"
"riya82@gmail.com",1480,"Hyderabad Hub"
"kunal83@gmail.com",2380,"Pune Cafe"
"anushka84@gmail.com",920,"Kolkata Store"
"rohit85@gmail.com",610,"Delhi Cafe"
"mehak86@gmail.com",1340,"Mumbai Store"
"yuvraj87@gmail.com",2470,"Bangalore Store"
"nikita88@gmail.com",870,"Chennai Outlet"
"harshita89@gmail.com",540,"Hyderabad Hub"
"armaan90@gmail.com",1580,"Pune Cafe"
"suhani91@gmail.com",2190,"Kolkata Store"
"ayush92@gmail.com",960,"Delhi Cafe"
"ritika93@gmail.com",730,"Mumbai Store"
"devansh94@gmail.com",1260,"Bangalore Store"
"sakshi95@gmail.com",2310,"Chennai Outlet"
"manav96@gmail.com",890,"Hyderabad Hub"
"prachi97@gmail.com",570,"Pune Cafe"
"keshav98@gmail.com",1410,"Kolkata Store"
"avni99@gmail.com",2240,"Delhi Cafe"
"dhruv100@gmail.com",980,"Mumbai Store"
`;

  const totalPages = Math.ceil(data.total / 50);

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <Input
            placeholder="Search shopper name, email, or city..."
            value={search}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        {/* CSV Upload Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleModalClose}>
          <DialogTrigger render={
            <Button variant="outline" className="gap-2">
              <Upload className="h-4.5 w-4.5" />
              Ingest CSV Data
            </Button>
          } />
          <DialogContent className="sm:max-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Ingest CSV Dataset
              </DialogTitle>
              <DialogDescription>
                Upload a CSV file or paste your spreadsheet contents dynamically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 my-2">
              {/* Type Select buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={csvType === "customers" ? "default" : "outline"}
                  onClick={() => {
                    setCsvType("customers");
                    setCsvText("");
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Shopper Profiles CSV
                </Button>
                <Button
                  type="button"
                  variant={csvType === "orders" ? "default" : "outline"}
                  onClick={() => {
                    setCsvType("orders");
                    setCsvText("");
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Order Transactions CSV
                </Button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Drag and drop CSV file here or click to select"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv" 
                  onChange={handleFileSelect} 
                />
                
                {fileProgress !== null ? (
                  <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-sm font-medium">Reading CSV... {fileProgress}%</div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-300" style={{ width: `${fileProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">Drag & drop CSV here</p>
                    <p className="text-xs text-muted-foreground mb-4">or click to browse files (Max 25MB)</p>
                    <Button type="button" variant="secondary" size="sm" className="pointer-events-none">
                      Choose CSV File
                    </Button>
                  </>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-semibold">Or paste manually</span>
                </div>
              </div>

              {/* Paste textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Raw CSV contents:</span>
                  <button
                    type="button"
                    onClick={() => setCsvText(csvType === "customers" ? customersTemplate : ordersTemplate)}
                    className="text-primary hover:underline"
                  >
                    Insert Mock Template
                  </button>
                </div>
                <textarea
                  className="w-full h-44 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={csvType === "customers" ? "name,email,phone,city,tags..." : "email,totalAmount,storeLocation..."}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModalClose(false)}
                disabled={isUploading || fileProgress !== null}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUploadCSV}
                disabled={isUploading || fileProgress !== null || !csvText.trim()}
                className="gap-2"
              >
                {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Upload dataset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsaved Data Confirmation Dialog */}
        <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Unsaved CSV Data
              </DialogTitle>
              <DialogDescription>
                Uploading another file will replace your current textarea contents.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={cancelUnsavedData}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={confirmUnsavedData}>Replace Data</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          {/* <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] overflow-y-auto"> */}
          <DialogContent className="w-[85vw] !max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Import Preview
              </DialogTitle>
              <DialogDescription>
                Review the parsed structure of your uploaded CSV file before importing.
              </DialogDescription>
            </DialogHeader>

            {previewData && (
              <div className="space-y-6 my-2 w-full min-w-0">
                <div className="grid grid-cols-3 gap-4 text-sm bg-muted/40 p-4 rounded-lg w-full min-w-0">
                  <div className="min-w-0">
                    <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Detected File</div>
                    <div className="font-medium truncate" title={pendingFile?.name}>{pendingFile?.name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Total Rows</div>
                    <div className="font-medium">{previewData.rowCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Columns</div>
                    <div className="font-medium">{previewData.headers?.length || 0}</div>
                  </div>
                </div>

                {previewData.errors.length > 0 && (
                  <div role="alert" className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 font-semibold mb-2">
                      <AlertCircle className="h-4 w-4" />
                      We detected formatting issues in this CSV.
                    </div>
                    <div className="text-xs space-y-1 mb-3 max-h-24 overflow-y-auto">
                      {previewData.errors.slice(0, 5).map((e, i) => (
                        <div key={i}>Row {e.row}: {e.message}</div>
                      ))}
                      {previewData.errors.length > 5 && (
                        <div className="font-medium italic">...and {previewData.errors.length - 5} more errors.</div>
                      )}
                    </div>
                    <div className="text-sm font-medium">You can continue importing, but some records may fail on the backend.</div>
                  </div>
                )}

                <div className="w-full min-w-0">
                  <h4 className="text-sm font-semibold mb-3">First 3 rows preview</h4>
                  <div className="rounded-md border border-border w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          {previewData.headers?.map((h, i) => (
                            <TableHead key={i} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell key={j} className="text-xs whitespace-nowrap truncate max-w-[200px]" title={cell}>
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => {
                setShowPreviewDialog(false);
                resetUploadState();
              }}>Cancel</Button>
              <Button size="sm" onClick={commitFile}>Use This CSV</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Database Table card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Shoppers Directory</span>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {data.items.length} of {data.total} profiles
            </span>
          </CardTitle>
          <CardDescription>
            Database of customer subscribers, total spends, and locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No customer records match your filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Customer</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Contact</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Location</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Tags</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Orders</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((cust: any) => (
                      <TableRow key={cust.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium text-foreground py-3">
                          {cust.name}
                        </TableCell>
                        <TableCell className="text-xs font-mono py-3">
                          <div className="flex flex-col gap-0.5">
                            <span>{cust.email}</span>
                            {cust.phone && <span className="text-[10px] text-muted-foreground">{cust.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3">{cust.city || "—"}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {cust.tags.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              cust.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] uppercase px-1 py-0 font-bold bg-muted text-muted-foreground">
                                  {tag}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold py-3">
                          {cust.totalOrders}
                        </TableCell>
                        <TableCell className="text-sm text-right font-bold text-foreground py-3">
                          ₹{cust.totalSpent.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Previous page"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Next page"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
