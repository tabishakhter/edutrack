import { useState, useEffect } from 'react';
import api from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

const FeeManagement = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFormData, setPaymentFormData] = useState({
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    month: format(new Date(), 'MMMM'),
    year: new Date().getFullYear(),
    remarks: ''
  });
  const [structureFormData, setStructureFormData] = useState({
    class_name: '',
    amount: '',
    frequency: 'monthly'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, paymentsRes, structuresRes, classesRes] = await Promise.all([
        api.get('/students'),
        api.get('/fee-payments'),
        api.get('/fee-structures'),
        api.get('/classes')
      ]);
      setStudents(studentsRes.data);
      setPayments(paymentsRes.data);
      setFeeStructures(structuresRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fee-payments', {
        ...paymentFormData,
        payment_date: new Date(paymentFormData.payment_date).toISOString(),
        amount: parseFloat(paymentFormData.amount),
        year: parseInt(paymentFormData.year)
      });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      fetchData();
      resetPaymentForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleStructureSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fee-structures', {
        ...structureFormData,
        amount: parseFloat(structureFormData.amount)
      });
      toast.success('Fee structure saved successfully');
      setStructureDialogOpen(false);
      fetchData();
      resetStructureForm();
    } catch (error) {
      toast.error('Failed to save fee structure');
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/fee-payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Receipt downloaded');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      student_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      month: format(new Date(), 'MMMM'),
      year: new Date().getFullYear(),
      remarks: ''
    });
  };

  const resetStructureForm = () => {
    setStructureFormData({
      class_name: '',
      amount: '',
      frequency: 'monthly'
    });
  };

  const filteredPayments = payments.filter(payment =>
    payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading fee data...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="fee-management-title">
          Fee Management
        </h1>
        <p className="text-slate-600">Manage fee structures and record payments</p>
      </div>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payments" data-testid="payments-tab">Payment Records</TabsTrigger>
          <TabsTrigger value="structures" data-testid="structures-tab">Fee Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <div className="flex justify-end mb-4">
            <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) resetPaymentForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-700 hover:bg-emerald-800" data-testid="record-payment-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Record Fee Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="student">Student</Label>
                    <select
                      id="student"
                      data-testid="payment-student"
                      value={paymentFormData.student_id}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, student_id: e.target.value })}
                      className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                      required
                    >
                      <option value="">Select Student</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} - {student.class_name} {student.section}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        data-testid="payment-amount"
                        type="number"
                        step="0.01"
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_date">Payment Date</Label>
                      <Input
                        id="payment_date"
                        data-testid="payment-date"
                        type="date"
                        value={paymentFormData.payment_date}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="month">Month</Label>
                      <select
                        id="month"
                        data-testid="payment-month"
                        value={paymentFormData.month}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, month: e.target.value })}
                        className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                        required
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        data-testid="payment-year"
                        type="number"
                        value={paymentFormData.year}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, year: e.target.value })}
                        required
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                    <Input
                      id="remarks"
                      data-testid="payment-remarks"
                      value={paymentFormData.remarks}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="payment-submit">
                    Record Payment
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by student name or class..."
                    data-testid="search-payments"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Month/Year</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          No payments recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                          <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{payment.student_name}</TableCell>
                          <TableCell>{payment.class_name} - {payment.section}</TableCell>
                          <TableCell>{payment.month} {payment.year}</TableCell>
                          <TableCell className="font-medium">₹{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadReceipt(payment.id)}
                              data-testid={`download-receipt-${payment.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures">
          <div className="flex justify-end mb-4">
            <Dialog open={structureDialogOpen} onOpenChange={(open) => { setStructureDialogOpen(open); if (!open) resetStructureForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-700 hover:bg-emerald-800" data-testid="add-fee-structure-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Fee Structure
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Set Fee Structure</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleStructureSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="structure-class">Class</Label>
                    <select
                      id="structure-class"
                      data-testid="structure-class"
                      value={structureFormData.class_name}
                      onChange={(e) => setStructureFormData({ ...structureFormData, class_name: e.target.value })}
                      className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.name}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="structure-amount">Amount (₹)</Label>
                    <Input
                      id="structure-amount"
                      data-testid="structure-amount"
                      type="number"
                      step="0.01"
                      value={structureFormData.amount}
                      onChange={(e) => setStructureFormData({ ...structureFormData, amount: e.target.value })}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <select
                      id="frequency"
                      data-testid="structure-frequency"
                      value={structureFormData.frequency}
                      onChange={(e) => setStructureFormData({ ...structureFormData, frequency: e.target.value })}
                      className="w-full mt-1.5 h-11 px-4 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                      required
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="structure-submit">
                    Save Fee Structure
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Fee Structures</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        No fee structures set
                      </TableCell>
                    </TableRow>
                  ) : (
                    feeStructures.map((structure) => (
                      <TableRow key={structure.id} data-testid={`structure-row-${structure.id}`}>
                        <TableCell className="font-medium">{structure.class_name}</TableCell>
                        <TableCell>₹{structure.amount.toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{structure.frequency}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeeManagement;
