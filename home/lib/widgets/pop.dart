import 'package:flutter/material.dart';

class DisasterTypeSelection extends StatelessWidget {
  final Function(String) onSelected;

  const DisasterTypeSelection({super.key, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20.0),
      ),
      child: Container(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'logo (1).png',
              width: 80,
              height: 80,
            ),
            const SizedBox(height: 16),
            const Text(
              'SELECT TYPE OF DISASTER',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF333333),
              ),
            ),
            const SizedBox(height: 24),
            _buildButton(context, 'Flood', const Color(0xFFD6F2FF)),
            const SizedBox(height: 12),
            _buildButton(context, 'Landslide', const Color(0xFFFAF0C8)),
            const SizedBox(height: 12),
            _buildButton(context, 'Earthquake', const Color(0xFFDDF5D8)),
            const SizedBox(height: 12),
            _buildButton(context, 'Typhoon', const Color(0xFFFFD8D8)),
          ],
        ),
      ),
    );
  }

  Widget _buildButton(BuildContext context, String text, Color color) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.black87,
          padding: const EdgeInsets.symmetric(vertical: 16),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        onPressed: () {
          onSelected(text);
          Navigator.pop(context, text);
        },
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }
}