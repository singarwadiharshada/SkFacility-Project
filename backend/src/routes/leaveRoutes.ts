import express from 'express';
import {
  getAllLeaves,
  getEmployeeLeaves,
  getSupervisorLeaves,
  applyForLeave,
  updateLeaveStatus,
  getSupervisorEmployees,
  getLeaveStats,
  getAllDepartments,
  getEmployeeCountByDepartment
} from '../controllers/leaveController';
import Employee from '../models/Employee';

const router = express.Router();

// Test route to check employee data - FIXED PATH
router.get('/test/employees', async (req, res) => {
  try {
    const employees = await Employee.find().limit(10);
    
    // Get all departments
    const departments = await Employee.distinct('department');
    
    // Get counts
    const totalCount = await Employee.countDocuments();
    const activeCount = await Employee.countDocuments({ status: 'active' });
    
    res.json({
      success: true,
      totalCount,
      activeCount,
      departments,
      sampleEmployees: employees.map(emp => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        phone: emp.phone,
        email: emp.email,
        status: emp.status
      }))
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Route to add a test employee (for testing)
router.post('/test/add-employee', async (req, res) => {
  try {
    const { employeeId, name, department, position, phone, email } = req.body;
    
    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
    
    const employee = new Employee({
      employeeId,
      name,
      department,
      position,
      phone,
      email,
      status: 'active'
    });
    
    await employee.save();
    
    res.json({
      success: true,
      message: 'Employee added successfully',
      employee
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get all departments
router.get('/departments', getAllDepartments);

// Get employee count by department
router.get('/employee-count', getEmployeeCountByDepartment);

// Main routes
router.post('/apply', applyForLeave);
router.get('/employee/:employeeId', getEmployeeLeaves);
router.get('/supervisor', getSupervisorLeaves);
router.get('/supervisor/employees', getSupervisorEmployees); // This is the route you're calling
router.get('/', getAllLeaves);
router.put('/:id/status', updateLeaveStatus);
router.get('/stats', getLeaveStats);

export default router;