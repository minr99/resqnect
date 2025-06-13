import 'package:flutter/material.dart';
import 'package:resqnect/screens/home.dart';
import '../widgets/pop.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';

class Assistance extends StatefulWidget {
  final String fullName;
  final String gender;
  final String contact;
  final String address;
  final String age;
  final String barangay;
  final String profileUrl;
  final String emergencyContactName;
  final String emergencyContactNumber;

  const Assistance({
    super.key,
    required this.fullName,
    required this.gender,
    required this.contact,
    required this.address,
    required this.age,
    required this.barangay,
    required this.profileUrl,
    required this.emergencyContactName,
    required this.emergencyContactNumber,
  });

  @override
  State<Assistance> createState() => _AssistanceState();
}

class _AssistanceState extends State<Assistance> with SingleTickerProviderStateMixin {
  late AnimationController _emergencyController;
  List<Map<String, dynamic>> recentRequests = [];
  bool isLoading = true;
  StreamSubscription? _requestSubscription;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  String currentBarangay = '';
  Timer? _migrationCheckTimer;

  @override
  void initState() {
    super.initState();
    _emergencyController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
    _setupRequestListener();
    _loadCurrentBarangay();
    // Start periodic check for migration
    _migrationCheckTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      checkForMigration();
    });
    // Initial check
    checkForMigration();
  }

  @override
  void dispose() {
    _emergencyController.dispose();
    _requestSubscription?.cancel();
    _migrationCheckTimer?.cancel();
    super.dispose();
  }

  void _setupRequestListener() {
    // Cancel any existing subscription
    _requestSubscription?.cancel();

    // Set up real-time listener with error handling
    _requestSubscription = _firestore
        .collection('assistance_request')
        .where('fullName', isEqualTo: widget.fullName)
        .snapshots()
        .listen(
          (snapshot) {
            if (!mounted) return;
            
            setState(() {
              try {
                if (snapshot.docs.isNotEmpty) {
                  // Sort the documents by timestamp in memory
                  final sortedDocs = snapshot.docs.toList()
                    ..sort((a, b) {
                      final aTime = a.data()['timestamp'] as Timestamp?;
                      final bTime = b.data()['timestamp'] as Timestamp?;
                      if (aTime == null || bTime == null) return 0;
                      return bTime.compareTo(aTime);
                    });

                  final doc = sortedDocs.first;
                  final data = doc.data();
                  
                  // Check if the request is not completed (checking both status and adminStatus)
                  final status = data['status'] as String?;
                  final adminStatus = data['adminStatus'] as String?;
                  
                  if (status != 'Handled' && adminStatus != 'Completed') {
                    recentRequests = [{
                      'id': doc.id,
                      ...data,
                    }];
                  } else {
                    recentRequests = [];
                  }
                } else {
                  recentRequests = [];
                }
                isLoading = false;
              } catch (e) {
                print('Error processing snapshot: $e');
                isLoading = false;
              }
            });
          },
          onError: (error) {
            print('Error in request listener: $error');
            if (mounted) {
              setState(() {
                isLoading = false;
              });
            }
            // Attempt to reconnect after error
            Future.delayed(const Duration(seconds: 2), () {
              if (mounted) {
                _setupRequestListener();
              }
            });
          },
        );
  }

  Future<void> checkForMigration() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? residentUID = prefs.getString('residentUID');
      
      if (residentUID != null) {
        final docSnapshot = await FirebaseFirestore.instance
            .collection('residents')
            .doc(residentUID)
            .get();

        if (docSnapshot.exists) {
          final residentData = docSnapshot.data()!;
          final newBarangay = residentData['barangay'] as String;
          
          if (newBarangay != currentBarangay) {
            // Resident has been migrated
            final migrationReason = residentData['migrationReason'] as String? ?? 'Barangay reorganization';
            final migratedBy = residentData['migratedBy'] as String? ?? 'System';
            final migratedAt = residentData['migratedAt'] as Timestamp?;
            
            if (mounted) {
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (context) => AlertDialog(
                  title: const Text('Barangay Migration Notice'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('You have been migrated to $newBarangay.'),
                      const SizedBox(height: 8),
                      Text('Reason: $migrationReason'),
                      if (migratedBy != 'System') ...[
                        const SizedBox(height: 8),
                        Text('Migrated by: $migratedBy'),
                      ],
                      if (migratedAt != null) ...[
                        const SizedBox(height: 8),
                        Text('Date: ${migratedAt.toDate().toString().split('.')[0]}'),
                      ],
                      const SizedBox(height: 16),
                      const Text('Your future requests will be handled by your new barangay.'),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        // Update the current barangay
                        setState(() {
                          currentBarangay = newBarangay;
                        });
                        // Update SharedPreferences
                        prefs.setString('barangay', newBarangay);
                      },
                      child: const Text('OK'),
                    ),
                  ],
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      print('Error checking migration status: $e');
    }
  }

  Future<void> _loadCurrentBarangay() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedBarangay = prefs.getString('barangay');
      if (storedBarangay != null) {
        setState(() {
          currentBarangay = storedBarangay;
        });
      } else {
        setState(() {
          currentBarangay = widget.barangay;
        });
      }
    } catch (e) {
      print('Error loading current barangay: $e');
      setState(() {
        currentBarangay = widget.barangay;
      });
    }
  }

  String _getStatusMessage(String status, String? emergencyType) {
    // First check adminStatus if the request is forwarded to CDRRMO
    if (status == 'Forwarded to CDRRMO') {
      return 'CDRRMO Response Team is coordinating with Barangay for immediate action! 🚒';
    }

    // Then check the main status
    switch (status) {
      case 'Pending':
        return 'Your request is being reviewed by the Barangay Rescue Team... 🏥';
      case 'In Progress':
        if (emergencyType != null) {
          return '🚨 Barangay Rescue Team is en route to your location! Stay safe! 🚑';
        }
        return 'Barangay Rescue Team is on the way to assist you! 🚑';
      case 'Handled':
        return '✅ Barangay Rescue Team has completed your request. Stay safe!';
      default:
        return 'Status: $status';
    }
  }

  Color _getStatusColor(String status) {
    // First check if it's forwarded to CDRRMO
    if (status == 'Forwarded to CDRRMO') {
      return Colors.red;
    }

    // Then check the main status
    switch (status) {
      case 'Pending':
        return Colors.orange;
      case 'In Progress':
        return Colors.blue;
      case 'Handled':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Request Assistance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.exit_to_app),
            onPressed: () {
              SystemNavigator.pop();
            },
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF1848A0).withOpacity(0.95),
              const Color(0xFF38A2FF).withOpacity(0.95),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom App Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Image.asset(
                      'logo (1).png',
                      height: 40,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      "REQUEST ASSISTANCE",
                      style: GoogleFonts.poppins(
                        color: const Color(0xFF1848A0),
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                    const Spacer(),
                    PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'home') {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => SplashScreen()),
                          );
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'request_assistance', child: Text('Request Assistance')),
                      ],
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1848A0).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.account_circle, color: Color(0xFF1848A0), size: 24),
                            Icon(Icons.arrow_drop_down, color: Color(0xFF1848A0)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Main Content
              Expanded(
                child: Stack(
                  children: [
                    // Background Pattern
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.05,
                        child: Image.asset(
                          'logo (1).png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    // Scrollable Content
                    SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Assistance Buttons Grid
                          GridView.count(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            crossAxisCount: 2,
                            mainAxisSpacing: 16,
                            crossAxisSpacing: 16,
                            childAspectRatio: 1.2,
                            children: [
                              _buildAssistanceCard(
                                "Medical Assistance",
                                Icons.medical_services,
                                const Color.fromARGB(255, 124, 209, 252),
                                () => addRequestToDatabase(context, "Medical Assistance"),
                              ),
                              _buildAssistanceCard(
                                "Resource Assistance",
                                Icons.lightbulb,
                                Colors.green.shade200,
                                () => addRequestToDatabase(context, "Resource Assistance"),
                              ),
                              _buildAssistanceCard(
                                "Emergency Assistance",
                                Icons.warning,
                                Colors.red.shade200,
                                () => showEmergencyTypeDialog(context),
                                isFullWidth: true,
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),
                          // Current Request Status Section
                          Text(
                            "Current Request Status",
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (isLoading)
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const CircularProgressIndicator(),
                                    const SizedBox(height: 16),
                                    Text(
                                      "Loading request status...",
                                      style: GoogleFonts.poppins(
                                        color: Colors.grey,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          else if (recentRequests.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.check_circle_outline,
                                      size: 48,
                                      color: Colors.green.shade400,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      "No active requests",
                                      style: GoogleFonts.poppins(
                                        color: Colors.grey,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      "Your previous request has been completed",
                                      style: GoogleFonts.poppins(
                                        color: Colors.grey.shade600,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          else
                            _buildStatusCard(recentRequests[0]),
                          const SizedBox(height: 32),
                          // Personal Information Section
                          Text(
                            "Personal Information",
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildUserInfoCard(),
                          const SizedBox(height: 32),
                          // Legend Section
                          Text(
                            "Assistance Types Legend",
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildLegendCard(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAssistanceCard(String title, IconData icon, Color color, VoidCallback onTap, {bool isFullWidth = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: color),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF1848A0), width: 2),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(40),
              child: widget.profileUrl.isNotEmpty
                  ? Image.network(widget.profileUrl, fit: BoxFit.cover)
                  : const Icon(Icons.person, size: 40, color: Color(0xFF1848A0)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.fullName,
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    color: const Color(0xFF1848A0),
                  ),
                ),
                const SizedBox(height: 12),
                _buildInfoRow("Age", widget.age),
                _buildInfoRow("Gender", widget.gender),
                _buildInfoRow("Address", "${widget.address.split(',')[0]}, ${widget.barangay}"),
                _buildInfoRow("Contact", widget.contact),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              "$label:",
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w500,
                fontSize: 14,
                color: Colors.black54,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildLegendItem(
            "Medical Assistance",
            "For injuries, need for medicine, first aid, or health-related emergencies.",
            const Color.fromARGB(255, 124, 209, 252),
          ),
          const Divider(height: 24),
          _buildLegendItem(
            "Resource Assistance",
            "For food, water, clothing, shelter, or other non-medical supplies.",
            Colors.green.shade200,
          ),
          const Divider(height: 24),
          _buildLegendItem(
            "Emergency Assistance",
            "For life-threatening situations, flood, earthquake, landslide, typhoon or rescue.",
            Colors.red.shade200,
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String title, String description, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: const Color(0xFF1848A0),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: Colors.black54,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void addRequestToDatabase(BuildContext context, String assistanceType, {String? emergencyType}) async {
    String priority;
    if(assistanceType == 'Emergency Assistance' || assistanceType == 'Flood' || assistanceType =='Earthquake' || assistanceType == 'Landslide' || assistanceType == 'Typhoon') {
      priority = 'High';
    } else if(assistanceType == 'Medical Assistance') {
      priority = 'Moderate';
    } else {
      priority = 'Low';
    }

    try {
      final firestore = FirebaseFirestore.instance;

      Map<String, dynamic> requestData = {
        'fullName': widget.fullName,
        'gender': widget.gender,
        'contact': widget.contact,
        'address': widget.address,
        'age': widget.age,
        'assistanceType': assistanceType =="Flood" || assistanceType == "Landslide" || assistanceType == "Earthquake" || assistanceType == "Typhoon"
          ? "Emergency Assistance"
          : assistanceType,
        'priority': priority,
        'timestamp': FieldValue.serverTimestamp(),
        'status': 'Pending',
        'barangay': currentBarangay,
        'profilePicUrl': widget.profileUrl,
        'emergencyContactName': widget.emergencyContactName,
        'emergencyContactNumber': widget.emergencyContactNumber,
      };

      if (assistanceType == "Flood" || assistanceType == "Landslide" || assistanceType == "Earthquake" || assistanceType == "Typhoon") {
        requestData['emergencyType'] = assistanceType;
      }

      await firestore.collection('assistance_request').add(requestData);

      String message;
      if (assistanceType == "Flood" || assistanceType == "Landslide" || assistanceType == "Earthquake" || assistanceType == "Typhoon") {
        message = "$assistanceType emergency assistance submitted successfully!";
      } else {
        message = "$assistanceType submitted successfully!";
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Failed to submit request."),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void showEmergencyTypeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return DisasterTypeSelection(
          onSelected: (String disasterType) {
            addRequestToDatabase(context, disasterType, emergencyType: disasterType);
          },
        );
      },
    );
  }

  Widget _buildStatusCard(Map<String, dynamic> request) {
    final status = request['status'] as String?;
    final adminStatus = request['adminStatus'] as String?;
    final isEmergency = request['assistanceType'] == 'Emergency Assistance';
    final emergencyType = request['emergencyType'] as String?;

    // Determine the effective status and color
    String effectiveStatus = status ?? 'Pending';
    Color statusColor = _getStatusColor(effectiveStatus);
    String statusMessage = _getStatusMessage(effectiveStatus, emergencyType);

    // If forwarded to CDRRMO, show admin status if available
    if (status == 'Forwarded to CDRRMO' && adminStatus != null) {
      if (adminStatus == 'In Progress') {
        statusMessage = '🚨 CDRRMO Emergency Response Team is en route to your location! Stay safe! 🚒';
        statusColor = Colors.purple;
      } else if (adminStatus == 'Completed') {
        statusMessage = '✅ CDRRMO Emergency Response Team has completed your request. Stay safe! 🚒';
        statusColor = Colors.green;
      }
    }

    Future<void> _cancelRequest() async {
      // Show confirmation dialog
      final bool? confirm = await showDialog<bool>(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: Text(
              'Cancel Request',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w600,
              ),
            ),
            content: Text(
              'Are you sure you want to cancel this request? This action cannot be undone.',
              style: GoogleFonts.poppins(),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(
                  'No',
                  style: GoogleFonts.poppins(
                    color: Colors.grey[600],
                  ),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text(
                  'Yes, Cancel',
                  style: GoogleFonts.poppins(
                    color: Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          );
        },
      );

      if (confirm == true) {
        try {
          // Update the request status in Firestore
          await FirebaseFirestore.instance
              .collection('assistance_request')
              .doc(request['id'])
              .update({
            'status': 'Canceled',
            'adminStatus': 'Canceled',
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Request has been canceled'),
                behavior: SnackBarBehavior.floating,
                backgroundColor: Colors.green,
              ),
            );
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Failed to cancel request'),
                behavior: SnackBarBehavior.floating,
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                if (isEmergency)
                  AnimatedBuilder(
                    animation: _emergencyController,
                    builder: (context, child) {
                      return Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(
                            0.2 + (_emergencyController.value * 0.3),
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.warning,
                          color: Colors.red,
                          size: 24,
                        ),
                      );
                    },
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      request['assistanceType'] == 'Medical Assistance'
                          ? Icons.medical_services
                          : Icons.lightbulb,
                      color: statusColor,
                      size: 24,
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        request['assistanceType'] == 'Emergency Assistance' &&
                                emergencyType != null
                            ? '${request['assistanceType']} - $emergencyType'
                            : request['assistanceType'],
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: statusColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        statusMessage,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  request['timestamp']?.toDate().toString().split('.')[0] ?? 'N/A',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.black54,
                  ),
                ),
              ],
            ),
          ),
          // Add cancel button if request is not completed or canceled
          if (status != 'Handled' && status != 'Canceled' && adminStatus != 'Completed')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: Colors.grey,
                    width: 0.5,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: _cancelRequest,
                    icon: const Icon(
                      Icons.cancel_outlined,
                      color: Colors.red,
                      size: 20,
                    ),
                    label: Text(
                      'Cancel Request',
                      style: GoogleFonts.poppins(
                        color: Colors.red,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}